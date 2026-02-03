use std::{
    path::{Path, PathBuf},
    sync::LazyLock,
};

use anyhow::Context;
use feed_rs::model::{Entry, Feed};
use maud::{self, Markup, PreEscaped, html};
use regex::Regex;
use url::Url;

fn main() -> anyhow::Result<()> {
    let args: Vec<_> = std::env::args().skip(1).collect();

    let out_dir = match args.as_slice() {
        [] => PathBuf::from("out/"),
        [out_dir] => PathBuf::from(out_dir),
        _ => {
            eprintln!("usage: site [out_dir=out/]");
            std::process::exit(1);
        }
    };

    let _ = std::fs::create_dir(&out_dir);

    // static assets
    let static_dir = out_dir.join("static");
    std::fs::create_dir_all(&static_dir)?;
    copy_static("static", static_dir)?;

    // top level pages
    for path in readdir("content")? {
        let page = Page::read_from(path.clone())
            .with_context(|| format!("failed to parse {path}", path = path.display()))?;
        let output_path = out_dir.join(format!("{slug}.html", slug = page.slug));

        write_page(&page, &output_path)?;
    }

    // blogroll!
    eprintln!("building blogroll:");
    let page = blogroll("blogroll.txt", |url| eprintln!("  fetching {url}"))?;
    std::fs::create_dir_all(out_dir.join("blogroll"))?;
    let output_path = out_dir.join("blogroll/index.html");
    write_page(&page, &output_path)?;

    // posts
    let posts_dir = out_dir.join("posts");
    let mut post_list = vec![];
    for path in readdir("content/posts")? {
        let page = Page::read_from(path.clone())
            .with_context(|| format!("failed to parse {path}", path = path.display()))?;

        let post_dir = posts_dir.join(&page.slug);
        let output_path = post_dir.join("index.html");

        std::fs::create_dir_all(&post_dir)?;
        write_page(&page, &output_path)?;
        post_list.push(page);
    }

    // render the post list. sort it inverse by date
    post_list.sort_by(|a, b| b.date.cmp(&a.date));
    let out_path = posts_dir.join("index.html");
    eprintln!("rendering: {}", out_path.display());
    std::fs::write(out_path, render_posts(post_list).into_string())?;

    Ok(())
}

fn copy_static(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    std::fs::create_dir_all(&dst)?;

    for dirent in std::fs::read_dir(src)? {
        let dirent = dirent?;
        let src = dirent.path();
        let dst = dst.as_ref().join(dirent.file_name());

        if dirent.file_type()?.is_dir() {
            copy_static(dirent.path(), dst)?
        } else {
            eprintln!("copying: {} -> {}", src.display(), dst.display());
            std::fs::copy(src, dst)?;
        }
    }

    Ok(())
}

fn readdir(path: impl AsRef<Path>) -> anyhow::Result<impl Iterator<Item = PathBuf>> {
    let iter = std::fs::read_dir(path)?.filter_map(|e| {
        let e = e.unwrap();
        e.file_type().unwrap().is_file().then(|| e.path())
    });
    Ok(iter)
}

#[derive(Debug, Clone)]
struct Page {
    title: String,
    date: Option<String>,
    desc: Option<String>,
    slug: String,
    content: Markup,
    path: PathBuf,
}

impl Page {
    pub(crate) fn read_from(path: PathBuf) -> anyhow::Result<Self> {
        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| anyhow::anyhow!("invalid filename"))?;

        static RE: LazyLock<Regex> =
            LazyLock::new(|| Regex::new(r#"(?:\d{4}-\d{2}-\d{2}-)?(.*)\.md"#).unwrap());

        let re_match = RE
            .captures(filename)
            .ok_or_else(|| anyhow::anyhow!("invalid slug"))?;

        let (_, [slug]) = re_match.extract();
        let slug = slug.to_string();

        let md = std::fs::read_to_string(&path)?;
        let parser = parse_markdown(&md);

        Self::parse(path.clone(), slug.to_string(), parser)
    }

    fn parse(
        path: PathBuf,
        slug: String,
        mut parser: pulldown_cmark::Parser,
    ) -> anyhow::Result<Page> {
        use pulldown_cmark::{Event, Tag, TagEnd};

        // pull the first three events off the stream
        let Some(Event::Start(Tag::MetadataBlock(_))) = parser.next() else {
            anyhow::bail!("expected a metadata block to start");
        };
        let Some(Event::Text(txt)) = parser.next() else {
            anyhow::bail!("expected metadata block containing text");
        };
        let Some(Event::End(TagEnd::MetadataBlock(_))) = parser.next() else {
            anyhow::bail!("expected the end of a metadata block");
        };

        let content = render_html(parser, None);

        // parse metadata
        let metadata = txt
            .parse::<toml::Table>()
            .with_context(|| "invalid post metadata")?;
        let title = get_string(&metadata, "title")?;
        let date = get_string_opt(&metadata, "date");
        let desc = get_string_opt(&metadata, "description");

        Ok(Page {
            path,
            slug,
            title,
            date,
            desc,
            content,
        })
    }
}

fn blogroll<F>(path: impl AsRef<Path>, cb: F) -> anyhow::Result<Page>
where
    F: Fn(&str),
{
    let path = path.as_ref().to_path_buf();
    let client = ureq::Agent::new_with_defaults();
    let url_list = std::fs::read_to_string(&path)?;

    let mut entries = vec![];
    for url in url_list.lines() {
        let url = url.trim();
        cb(url);
        let feed = fetch_feed(&client, url)?;
        entries.extend(feed.entries.into_iter().take(3));
    }
    entries.sort_by(|a, b| b.updated.cmp(&a.updated));

    let content = blogroll_content(&entries);
    Ok(Page {
        title: String::new(),
        date: None,
        desc: None,
        slug: String::new(),
        content,
        path,
    })
}

fn blogroll_content(entries: &[Entry]) -> Markup {
    let domain = |url: &str| Url::parse(url).ok().map(|u| u.authority().to_string());

    let title = |e: &Entry| {
        e.title
            .as_ref()
            .map(|t| t.content.to_string())
            .unwrap_or_default()
    };

    let updated = |e: &Entry| {
        e.updated
            .as_ref()
            .map(|d| format!("({})", d.date_naive()))
            .unwrap_or_default()
    };

    let content = html! {
        ul {
            @for entry in entries {
                @let url = entry_url(entry).unwrap_or_default();
                li {
                    a href=(url) { b { (title(entry)) } } " " (updated(entry))
                    br;
                    (domain(&url).unwrap_or_default())
                }
            }
        }
    };

    content
}

fn entry_url(entry: &Entry) -> Option<String> {
    let link = entry.links.first()?;
    Some(link.href.clone())
}

/// get the key as a string, no matter what type the value is
#[inline]
fn get_string(table: &toml::Table, key: &'static str) -> anyhow::Result<String> {
    let val = table
        .get(key)
        .ok_or_else(|| anyhow::anyhow!("missing {key}"))?;

    match val {
        toml::Value::String(s) => Ok(s.to_string()),
        _ => Ok(val.to_string()),
    }
}

/// get the key as a string if it's present, no matter what type the value is
#[inline]
fn get_string_opt(table: &toml::Table, key: &'static str) -> Option<String> {
    let val = table.get(key)?;
    match val {
        toml::Value::String(s) => Some(s.clone()),
        _ => Some(val.to_string()),
    }
}

fn render_html(parser: pulldown_cmark::Parser, size_hint: Option<usize>) -> PreEscaped<String> {
    let mut buf = String::with_capacity(size_hint.unwrap_or(1024));
    pulldown_cmark::html::push_html(&mut buf, parser);

    PreEscaped(buf)
}

fn parse_markdown(md: &str) -> pulldown_cmark::Parser<'_> {
    pulldown_cmark::Parser::new_ext(md, {
        use pulldown_cmark::Options;

        Options::ENABLE_TABLES
            | Options::ENABLE_FOOTNOTES
            | Options::ENABLE_STRIKETHROUGH
            | Options::ENABLE_TASKLISTS
            | Options::ENABLE_PLUSES_DELIMITED_METADATA_BLOCKS
    })
}

fn write_page(page: &Page, output_path: &Path) -> anyhow::Result<()> {
    eprintln!(
        "rendering: {} -> {}",
        page.path.display(),
        output_path.display()
    );

    std::fs::write(output_path, render_page(page).into_string())?;

    Ok(())
}

fn render_page(page: &Page) -> Markup {
    let post_meta = page.date.as_ref().map(|date| {
        html! {
            p .post-meta {
                time datetime=(date) { (date) };
            };
        }
    });

    let title = if page.title.is_empty() {
        None
    } else {
        Some(html! { h1 { (page.title) } })
    };

    html! {
        (maud::DOCTYPE)
        html lang="en" {
            head {
                (meta_styling())
                script src="/static/highlight.min.js" {}
                script { "hljs.highlightAll();" }
            }
            body {
                div .w {
                    header {
                        nav class="top-nav" {
                            a href="/" { "home" };
                            a href="/posts" { "posts" };
                            a href="/blogroll" { "blogroll" };
                        }
                        (title.unwrap_or_default())
                        (post_meta.unwrap_or_default())
                    }
                    main aria-label="Content" class="page-content" {
                        (page.content)
                    }
                    footer {}
                }
            }
        }
    }
}

fn render_posts(posts: Vec<Page>) -> Markup {
    let url = |slug| format!("/posts/{slug}");
    let content = html! {
        ul {
            @for post in posts {
                li {
                    a href=(url(post.slug)) { b { (post.title) } } " (" (post.date.unwrap_or_default()) ") "
                    br;
                    (post.desc.unwrap_or_default())
                }
            }
        }
    };

    render_page(&Page {
        title: String::new(),
        date: None,
        desc: None,
        slug: String::new(),
        content,
        path: PathBuf::new(),
    })
}

fn meta_styling() -> Markup {
    html! {
        meta charset="utf-8";
        meta name="viewport" content="width=device-width, initial-scale=1";
        link rel="stylesheet" href="/static/style.css";
        link rel="stylesheet" href="/static/highlight.github-gist.min.css";
        link rel="icon" size="32x32" type="image/png" href="/static/favicon-32x32.png";
        link rel="icon" size="16x16" type="image/png" href="/static/favicon-16x16.png";
    }
}

fn fetch_feed(client: &ureq::Agent, url: &str) -> anyhow::Result<Feed> {
    let bs = client.get(url).call()?.body_mut().read_to_vec()?;
    let feed = feed_rs::parser::parse(bs.as_slice())?;
    Ok(feed)
}

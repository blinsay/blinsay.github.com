#!/bin/bash

set -ex

pushd zola > /dev/null
zola build --output-dir ../docs/ --force
popd > /dev/null

# commit pauses for input and diff review
git add zola/ docs/
git commit
git push origin HEAD

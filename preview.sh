#!/bin/bash

set -ex

pushd zola > /dev/null
zola serve -i 0.0.0.0 --base-url $(hostname) --drafts
popd > /dev/null

#!/bin/bash

set -ex

pushd zola > /dev/null
zola serve -i 0.0.0.0 --base-url booger
popd > /dev/null

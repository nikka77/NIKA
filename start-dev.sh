#!/bin/bash -l
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "/Users/macbookprom1pro/Library/Mobile Documents/com~apple~CloudDocs/NIKA" || exit 1
exec node node_modules/next/dist/bin/next dev

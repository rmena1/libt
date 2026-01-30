#!/bin/bash
export PATH="/home/clawdbot/clawd/projects/libt/node_modules/.bin:$PATH"
export NODE_ENV=development
export ZERO_UPSTREAM_DB="postgresql://postgres:postgres@localhost:5432/libt"
export ZERO_QUERY_FORWARD_COOKIES=true
export ZERO_MUTATE_FORWARD_COOKIES=true
export ZERO_QUERY_URL="http://localhost:3000/api/zero/query"
export ZERO_MUTATE_URL="http://localhost:3000/api/zero/mutate"
export ZERO_PORT=4849
export ZERO_CHANGE_STREAMER_PORT=4852
cd /home/clawdbot/clawd/projects/libt
exec zero-cache-dev

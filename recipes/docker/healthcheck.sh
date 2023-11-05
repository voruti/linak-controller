#!/bin/bash

response=$(curl -s -S "http://localhost:9123/height")

# ensure "height" field exists:
if [ -z "$(echo $response | jq -e '.height')" ]; then
  exit 1
fi

# ensure height is number:
heightString=$(echo $response | jq -r '.height')
if ! [[ $heightString =~ ^[0-9]+$ ]]; then
  exit 1
fi

exit 0

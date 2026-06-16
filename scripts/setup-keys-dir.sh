#!/usr/bin/env bash
# Create NetTools SSH key storage (run once on server / lab VM)
set -euo pipefail

KEYS_DIR="${NETTOOLS_SSH_KEYS_DIR:-/opt/nettools/data/keys}"
OWNER="${NETTOOLS_USER:-$(whoami)}"

sudo mkdir -p "$KEYS_DIR"
sudo chmod 700 /opt/nettools /opt/nettools/data "$KEYS_DIR" 2>/dev/null || sudo chmod 700 "$KEYS_DIR"
sudo chown -R "$OWNER:$OWNER" /opt/nettools

echo "SSH keys directory ready: $KEYS_DIR (owner: $OWNER)"

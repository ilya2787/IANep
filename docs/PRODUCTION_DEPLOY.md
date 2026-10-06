# Production deploy wrapper

`ianep-admin` may run one root-owned command without a sudo password. The command has no arguments and deploys the current `origin/master` to `/opt/ianep/app`. Git, npm install, and build run as `ianep`; root holds the lock and restarts only `ianep.service`. No general passwordless sudo or write access to the checkout is granted.

The exact sudoers rule is:

```sudoers
ianep-admin ALL=(root) NOPASSWD: /usr/local/sbin/ianep-deploy ""
```

Before installing, verify the SSH ED25519 fingerprint is `SHA256:zING1LB5kTWGxVV1CMUZhZHiO5d6+xYOwB0Wh+3JxAo` and ensure Beget console recovery remains available. Open the VPS VNC console in Beget and log in as root there. Type the existing root password only into that console, never into chat or a command. The `ianep-admin` account has no sudo password.

From the root shell, fetch the reviewed commit as `ianep`, stage its two files in a root-owned temporary directory, and compare their SHA-256 hashes with the locally reviewed copies before installing. Do not advance the application checkout during bootstrap. Install each file to a temporary path in its destination directory, then rename it into place:

```bash
id -u # must print 0
runuser -u ianep -- git -C /opt/ianep/app fetch --no-tags origin master
stage=$(mktemp -d /run/ianep-bootstrap.XXXXXX)
runuser -u ianep -- git -C /opt/ianep/app show origin/master:deploy/scripts/ianep-deploy > "$stage/ianep-deploy"
runuser -u ianep -- git -C /opt/ianep/app show origin/master:deploy/sudoers/ianep-deploy > "$stage/sudoers"
sha256sum "$stage/ianep-deploy" "$stage/sudoers" # compare with reviewed local hashes
install -o root -g root -m 0755 "$stage/ianep-deploy" /usr/local/sbin/ianep-deploy.new
mv -T /usr/local/sbin/ianep-deploy.new /usr/local/sbin/ianep-deploy
install -o root -g root -m 0440 "$stage/sudoers" /etc/sudoers.d/ianep-deploy.new
visudo -cf /etc/sudoers.d/ianep-deploy.new
mv -T /etc/sudoers.d/ianep-deploy.new /etc/sudoers.d/ianep-deploy
visudo -cf /etc/sudoers.d/ianep-deploy && visudo -c
rm -rf "$stage"
```

If either `visudo` check fails, remove the installed sudoers snippet immediately and stop. Check root ownership and file permissions before leaving the console. Do not change checkout ownership or give `ianep-admin` direct access.

From a fresh Mac/Work session, invoke:

```bash
ssh ianep-prod 'sudo -n /usr/local/sbin/ianep-deploy'
```

The wrapper refuses arguments, concurrent runs, unexpected checkout ownership or branch, a dirty checkout, a non-fast-forward update, and any Prisma schema or migration change. It prints current and target commits before update. It runs `npm ci` only for package manifest or lockfile changes, always builds, then restarts the service and checks active status and ready health with bounded retries. Review package changes before invoking, as installing dependencies may affect the existing build. Migration changes require a separate reviewed migration and backup plan.

If build fails after the fast-forward, the old service is left running; the checkout points to the new commit and needs manual attention. If restart or health fails, inspect `journalctl -u ianep.service` and the checkout. Do not rerun blindly or automatically roll back Git. For code-only recovery, verify schema compatibility, stop incoming traffic if needed, restore the last known-good code artifact under `ianep`, build, restart only `ianep.service`, and verify health. If schema or persistent data changed, use the coordinated database and storage recovery procedure in `docs/deployment.md`.

Never put sudo passwords, SSH keys, environment files, or secrets in the repository, command output, or chat. This wrapper does not change indexing, RKN, legal text, consent version, timers, backup policy, or other services.

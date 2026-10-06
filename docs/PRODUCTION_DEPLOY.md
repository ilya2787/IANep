# Production deploy wrapper

`ianep-admin` may run one root-owned command without a sudo password. The command has no arguments and deploys the current `origin/master` to `/opt/ianep/app`. Git, npm install, and build run as `ianep`; root holds the lock and restarts only `ianep.service`. No general passwordless sudo or write access to the checkout is granted.

The exact sudoers rule is:

```sudoers
ianep-admin ALL=(root) NOPASSWD: /usr/local/sbin/ianep-deploy
```

Before installing, verify the SSH ED25519 fingerprint is `SHA256:zING1LB5kTWGxVV1CMUZhZHiO5d6+xYOwB0Wh+3JxAo` and ensure Beget console recovery remains available. From an interactive `ianep-admin` shell, use ordinary password-protected sudo once; type the password only into that terminal:

```bash
sudo install -o root -g root -m 0755 /opt/ianep/app/deploy/scripts/ianep-deploy /usr/local/sbin/ianep-deploy
sudo visudo -cf /opt/ianep/app/deploy/sudoers/ianep-deploy
sudo install -o root -g root -m 0440 /opt/ianep/app/deploy/sudoers/ianep-deploy /etc/sudoers.d/ianep-deploy
sudo visudo -cf /etc/sudoers.d/ianep-deploy
sudo visudo -c
```

The bootstrap needs the repository files to be present on the server. If the production checkout cannot advance before the wrapper exists, transfer the two files from the verified local commit into a root-controlled temporary location, inspect their checksums, and substitute those paths in the installation commands. Do not change checkout ownership or give `ianep-admin` direct access.

From a fresh Mac/Work session, invoke:

```bash
ssh ianep-prod 'sudo -n /usr/local/sbin/ianep-deploy'
```

The wrapper refuses arguments, concurrent runs, unexpected checkout ownership or branch, a dirty checkout, a non-fast-forward update, and any Prisma schema or migration change. It prints current and target commits before update. It runs `npm ci` only for package manifest or lockfile changes, always builds, then restarts the service and checks active status and ready health with bounded retries. Review package changes before invoking, as installing dependencies may affect the existing build. Migration changes require a separate reviewed migration and backup plan.

If build fails after the fast-forward, the old service is left running; the checkout points to the new commit and needs manual attention. If restart or health fails, inspect `journalctl -u ianep.service` and the checkout. Do not rerun blindly or automatically roll back Git. For code-only recovery, verify schema compatibility, stop incoming traffic if needed, restore the last known-good code artifact under `ianep`, build, restart only `ianep.service`, and verify health. If schema or persistent data changed, use the coordinated database and storage recovery procedure in `docs/deployment.md`.

Never put sudo passwords, SSH keys, environment files, or secrets in the repository, command output, or chat. This wrapper does not change indexing, RKN, legal text, consent version, timers, backup policy, or other services.

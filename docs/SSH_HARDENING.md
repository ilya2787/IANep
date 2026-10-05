# Production SSH hardening

Target: `ianep-admin` with dedicated Ed25519 public key fingerprint `SHA256:f5dziuILXsWAOc90UUdaKkGgWwKphT6525U5sbOfWpo`. Private key: local `~/.ssh/ianep_prod_ed25519`, never in this repository. The key has no passphrase so scripted access can work unattended; keep the local account and key protected, rotate it if the workstation is compromised. The separate admin account uses a random password held in macOS Keychain service `ianep-prod-sudo`; sudo is the standard `sudo` group policy, not NOPASSWD. Do not put this password in chat or Git.

Production host key ED25519 fingerprint: `SHA256:zING1LB5kTWGxVV1CMUZhZHiO5d6+xYOwB0Wh+3JxAo`. Stop if it changes. Keep port 22 and existing UFW OpenSSH/Nginx Full rules. Keep root's account password for Beget console recovery. The runtime `ianep` account stays `nologin`.

## Before applying

1. Confirm Beget console and the root password work. Keep a root SSH session open throughout.
2. Back up `/etc/ssh/sshd_config`, `/etc/ssh/sshd_config.d`, relevant authorized keys and sudoers snippets into a root-only, timestamped `/root/ssh-backups/` directory. Current backup: `/root/ssh-backups/20261005T150326Z/`.
3. In a separate session, verify `ianep-admin` key login, `id`, home/shell, password-backed `sudo -v`, service and journal access, and app checkout access through sudo. Do not disable old access before this test passes.
4. Stage and validate the repository config against the VPS config. The filename must sort **before** `50-cloud-init.conf`, which sets `PasswordAuthentication yes`; a `90-...` file cannot override it under OpenSSH first-value-wins semantics.

## Install and verify

Run from an open root session after staging and validation:

```sh
install -o root -g root -m 0644 /opt/ianep/app/deploy/ssh/40-ianep-hardening.conf /etc/ssh/sshd_config.d/40-ianep-hardening.conf
sshd -t
sshd -T | grep -E '^(port|permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|permitemptypasswords|usepam|x11forwarding|allowagentforwarding|allowtcpforwarding|maxauthtries|logingracetime|clientaliveinterval|clientalivecountmax) '
systemctl reload ssh
```

Expect port 22, root/password/keyboard-interactive/empty-password/X11/agent forwarding disabled, public key and PAM enabled, `MaxAuthTries 3`, grace 30 seconds, client keepalive 300 seconds / 2 counts. `AllowTcpForwarding` intentionally retains its audited value (`yes`). Before reload, ensure every expected effective value matches. Do not reload on `sshd -t` failure or a mismatch.

Keep both original root and admin sessions open. From a **third fresh session**, verify admin key login and password-backed sudo. Make only one controlled root key attempt and one password-only mechanism check; avoid Fail2ban bans. Confirm the host key, Fail2ban jail, UFW rules, five services/timers, `/api/health` 200/ready, and no new error logs. Do not restart the app for these config/docs changes.

## Rollback / emergency recovery

From the open root session or Beget console (with the retained root password):

```sh
cp -a /root/ssh-backups/20261005T150326Z/sshd_config /etc/ssh/sshd_config
cp -a /root/ssh-backups/20261005T150326Z/sshd_config.d/. /etc/ssh/sshd_config.d/
rm -f /etc/ssh/sshd_config.d/40-ianep-hardening.conf
sshd -t && systemctl reload ssh
sshd -T | grep -E '^(permitrootlogin|passwordauthentication) '
```

If remote access fails, use Beget console; do not change firewall rules or disable SSH host-key checks. The rollback does not lock or delete the root password. Preserve older backups.

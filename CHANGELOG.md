# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).

### Unreleased

### [1.0.6] - 2025-01-30

- chore: update codeclimate config to eslint-8

### [1.0.5] - 2024-12-10

- deps: bumped versions to latest
- populate [files] in package.json.
- dep: eslint-plugin-haraka -> @haraka/eslint-config
- lint: remove duplicate / stale rules from .eslintrc
- doc: mv Changes.md CHANGELOG.md
- doc(CONTRIBUTORS): added

### [1.0.4] - 2023-12-12

- ci: publish updates, shared test actions
- doc(README): formatting

### [1.0.3] - 2022-06-05

- feat: instead of early exits, skip registering
- feat: add phish test
- feat(from_phish): check against SPF, DKIM, and ENV FROM
- ci: depends on shared haraka GHA workflows
- ci(codeclimate): relax some checks
- doc: fixes for config name

### 1.0.2 - 2020-08-22

- additional test
- updated test to newer JS standards
- don't call tests that aren't enabled in config (performance)

### 1.0.0 - 2020-07-28

- repackaged from Haraka
- added from_phish

[1.0.0]: https://github.com/haraka/haraka-plugin-headers/releases/tag/v1.0.0
[1.0.3]: https://github.com/haraka/haraka-plugin-headers/releases/tag/1.0.3
[1.0.4]: https://github.com/haraka/haraka-plugin-headers/releases/tag/v1.0.4
[1.0.5]: https://github.com/haraka/haraka-plugin-headers/releases/tag/v1.0.5
[1.0.6]: https://github.com/haraka/haraka-plugin-headers/releases/tag/v1.0.6

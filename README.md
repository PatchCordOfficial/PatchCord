# [<img src="./browser/icon.png" width="40" align="left" alt="PatchCord">](https://github.com/PatchCordOfficial/PatchCord) PatchCord

[![Tests](https://github.com/PatchCordOfficial/PatchCord/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/PatchCordOfficial/PatchCord/actions/workflows/test.yml)
[![GitHub](https://img.shields.io/badge/GitHub-PatchCord-black?style=flat\&logo=github)](https://github.com/PatchCordOfficial/PatchCord)

PatchCord is a fork of [Equicord](https://github.com/Equicord/Equicord), which itself is a fork of [Vencord](https://github.com/Vendicated/Vencord). It expands upon both projects with additional plugins, features, UI improvements, and quality-of-life enhancements while maintaining compatibility with the Discord desktop client.

You can visit the **GitHub repository** for updates, releases, issues, and discussions:

https://github.com/PatchCordOfficial/PatchCord

## Included Plugins

PatchCord includes all of the plugins from Equicord, alongside additional PatchCord-exclusive plugins and improvements.

## Installing / Uninstalling

### Windows

* GUI Installer *(Coming Soon)*
* CLI Installer *(Coming Soon)*

### macOS

* Intel *(Coming Soon)*
* Apple Silicon *(Coming Soon)*

### Linux

* GUI *(Coming Soon)*
* CLI *(Coming Soon)*

## Building PatchCord

### Dependencies

The following are required:

* [Git](https://git-scm.com/download)
* [Node.js LTS](https://nodejs.org/)
* pnpm

Install **pnpm**:

```sh
npm i -g pnpm
```

> **Important:** From this point onward, do **not** use an Administrator or root terminal, as it can cause permission issues with your Discord installation.

Clone PatchCord:

```sh
git clone https://github.com/PatchCordOfficial/PatchCord.git
cd PatchCord
```

Install dependencies:

```sh
pnpm install --frozen-lockfile
```

Build PatchCord:

```sh
pnpm build
```

Inject PatchCord into your desktop client:

```sh
pnpm inject
```

Build the browser extension:

```sh
pnpm buildWeb
```

After building the web extension, locate the generated ZIP inside the `dist` directory and install it according to your browser's extension loading instructions.

> Firefox requires the Developer Edition (or compatible builds) for unsigned extensions.

## Documentation

Documentation is available at:

**https://patchcord.itssolar.dev/docs.html**

## Credits

A huge thank you to the developers who made PatchCord possible.

* [Vendicated](https://github.com/Vendicated) — Creator of **Vencord**
* [Equicord Contributors](https://github.com/Equicord/Equicord) — Maintainers of **Equicord**
* [verticalsync](https://github.com/verticalsync) — Creator of **Suncord**
* Everyone who has contributed to PatchCord

## Star History

<a href="https://star-history.com/#PatchCordOfficial/PatchCord&Timeline">
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=PatchCordOfficial/PatchCord&type=Timeline" />
</a>

## Disclaimer

Discord is a trademark of Discord Inc. It is mentioned solely for descriptive purposes and does not imply any affiliation with or endorsement by Discord Inc.

PatchCord is an independent community project based on the open-source work of Vencord and Equicord. It is not affiliated with Discord Inc., Vencord, or Equicord.

<details>
<summary>Using PatchCord violates Discord's Terms of Service</summary>

Like all Discord client modifications, PatchCord technically violates Discord's Terms of Service.

However, there are currently no known cases of users being banned solely for using PatchCord, Equicord, or Vencord. As long as you avoid plugins that automate abusive behavior or break Discord's rules, the risk is generally considered low.

That said, if your Discord account is especially important to you, using the official Discord client is always the safest option.

You should also avoid posting screenshots showing PatchCord in communities where client modifications are prohibited.

</details>

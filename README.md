# [<img src="./browser/icon.png" width="40" align="left" alt="PatchCord">](https://github.com/PatchCordOfficial/PatchCord) PatchCord

[![Tests](https://github.com/PatchCordOfficial/PatchCord/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/PatchCordOfficial/PatchCord/actions/workflows/test.yml)
[![GitHub](https://img.shields.io/badge/GitHub-PatchCord-black?style=flat&logo=github)](https://github.com/PatchCordOfficial/PatchCord)

PatchCord is a fork of [Equicord](https://github.com/Equicord/Equicord), which itself is a fork of [Vencord](https://github.com/Vendicated/Vencord).

It expands upon both projects with additional plugins, quality-of-life improvements, interface enhancements, and exclusive PatchCord features while remaining compatible with the Discord desktop client.

---

## Features

- Includes every plugin from Equicord
- PatchCord-exclusive plugins
- Additional UI improvements
- Extra customization options
- Quality-of-life enhancements
- Open source

---

## Downloads

### Windows

| Installer | Download |
|-----------|----------|
| GUI Installer | **[Download](https://patchcord.itssolar.dev/download/gui/publish.zip)** |

---

## Building PatchCord

### Requirements

Install the following before building:

- [Git](https://git-scm.com/download)
- [Node.js LTS](https://nodejs.org/)
- pnpm

Install **pnpm**:

```sh
npm install -g pnpm
```

> **Important**
>
> Do **not** use an Administrator or root terminal when building or injecting PatchCord, as this can cause permission issues with your Discord installation.

Clone the repository:

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

Inject PatchCord into the Discord desktop client:

```sh
pnpm inject
```

Build the browser extension:

```sh
pnpm buildWeb
```

The generated extension ZIP will be located inside the `dist` directory.

> Firefox requires Developer Edition (or another build that allows unsigned extensions).

---

## Documentation

Documentation, guides, and setup instructions are available here:

**https://patchcord.itssolar.dev/docs.html**

---

## Repository

GitHub Repository:

**https://github.com/PatchCordOfficial/PatchCord**

You can use the repository to:

- Download the latest releases
- Report bugs
- Request features
- Browse the source code
- Join project discussions

---

## Credits

PatchCord wouldn't exist without these amazing projects and developers.

- [Vendicated](https://github.com/Vendicated) — Creator of **Vencord**
- [Equicord Contributors](https://github.com/Equicord/Equicord) — Maintainers of **Equicord**
- [verticalsync](https://github.com/verticalsync) — Creator of **Suncord**
- Everyone who has contributed to PatchCord ❤️

---

## Star History

<a href="https://star-history.com/#PatchCordOfficial/PatchCord&Timeline">
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=PatchCordOfficial/PatchCord&type=Timeline" />
</a>

---

## Disclaimer

Discord is a trademark of Discord Inc. It is mentioned solely for descriptive purposes and does not imply any affiliation with or endorsement by Discord Inc.

PatchCord is an independent open-source community project built upon the work of Vencord and Equicord. It is **not affiliated with, endorsed by, or associated with Discord Inc., Vencord, or Equicord.**

<details>
<summary><strong>Using PatchCord and Discord's Terms of Service</strong></summary>

Like all Discord client modifications, PatchCord technically violates Discord's Terms of Service.

There are currently **no known cases** of users being banned solely for using PatchCord, Equicord, or Vencord. Avoid plugins that automate abusive behavior or otherwise violate Discord's rules.

If your Discord account is especially important to you, using the official Discord client remains the safest option.

It is also recommended that you avoid posting screenshots showing PatchCord in communities that prohibit modified Discord clients.

</details>

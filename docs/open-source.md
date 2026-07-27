# Open-source and public-project landscape

Search date: **2026-07-14**. Discovery used GitHub repository/code search for Band 10, `FaceProject`, `.fprj`, `wfDef.json`, `MiBandWFTool`, `AmazfitBipTools`, compiler names, plus the active Codeberg Gadgetbridge project. “Public” does not automatically mean open source: repositories without a license or containing only proprietary binaries are marked accordingly.

Dates below are repository **last push** dates from the forge API unless a release date is explicitly named.

## Current Band 10 / modern Xiaomi projects

| Project | Purpose | Language/license | Last update | Band 10 | Pros | Cons |
|---|---|---|---|---|---|---|
| [ooflet/Mi-Create](https://github.com/ooflet/Mi-Create) | PyQt authoring/editor, FPRJ + experimental GMF, preview, AOD | Python, GPL-3.0; compiler excluded | 2026-01-21; release 1.1.1 2025-07-16 | **Yes** (`DeviceType 466`) | Best documented editable workflow; source available; Linux source support | Final compiler is closed third-party .NET; macOS untested; community reports instability |
| [m0tral/EasyFace](https://github.com/m0tral/EasyFace) | De facto Windows editor/compiler distribution | Public binaries/docs, **no source license** | 2025-07-08; compiler 4.22 | **Yes**, explicit | Broad modern-device support; compiler used by community; emulator handoff | Not actually open source; Windows/admin/runtime dependencies; modded Mi Fitness/server workflow |
| [zhy8388608/Mi8WfBinTool](https://github.com/zhy8388608/Mi8WfBinTool) | Standalone binary pack/unpack and published format notes | Java, **no license** | 2026-05-20 | **Claims yes** (`o66`) | Most complete public modern binary code/spec; no external Java deps | No reuse license; failed on two valid Band 10 samples in this research; limited tests/releases |
| [kyoko-tk/Mi-Band-10-Watchface-Editor](https://github.com/kyoko-tk/Mi-Band-10-Watchface-Editor) | Flask/browser XML live preview around a compiler | JavaScript/Python, no license; bundled EXE | 2025-11-06 | **Yes**, explicit | Band 10-focused live XML preview and coordinate editing | One small release/commit lineage; closed `WatchfaceCompiler.exe`; Windows build path; no demonstrated independent codec |
| [Pzqqt/Fprj_to_wfDef](https://github.com/Pzqqt/Fprj_to_wfDef) | Convert FPRJ XML to GMF JSON and preview it | Python, MIT | 2024-10-31 | Family-compatible; no explicit o66 claim | Permissive source; useful mapping reference; preview script | Converter, not final installer/compiler; authored for Band 8-era format |
| [RedKage/Xiaomi_Band_Tools](https://github.com/RedKage/Xiaomi_Band_Tools) | Decompiled m0tral compiler/unpacker source | C#, no license | 2025-11-26 | Likely modern family; not proven | Reveals implementation structure; potential route to .NET 9/Linux | Author says it builds but probably does not run; provenance/license issues; hard-coded DLLs |
| [juzeon/mi-band-faces](https://github.com/juzeon/mi-band-faces) | Band 10 FPRJ source projects with AOD | Assets/XML, license `NOASSERTION` | 2025-09-01 | **Yes**, explicit `466` | Excellent real source/AOD corpus | Sample faces, not tooling; artwork reuse rights unclear |
| [elfimov-design/pill-dial-smart-band-10](https://github.com/elfimov-design/pill-dial-smart-band-10) | Installable Band 10 binary/test vector | Binary/assets, no license | 2025-08-18 | **Yes**, tested firmware 21.7.1 | Concrete installable `.bin`; firmware/test notes | No source project/compiler; third-party installation required |
| [Sucharek233/MB10-Toolbox](https://github.com/Sucharek233/MB10-Toolbox) | Lua toolbox adapted to Band 10, wrapped by FPRJ | Lua, no license | 2025-08-02 | **Yes** | Decompiled source and practical advanced-face example | Derivative/provenance caveat; app-like face, not normal widget toolkit |
| [Sucharek233/MB10-SensorTest](https://github.com/Sucharek233/MB10-SensorTest) | Band 10 Lua sensor tester | Lua, no license | 2025-09-05 | **Yes** | Useful runtime API/sensor exploration | Not a package/editor tool |
| [Sucharek233/MiBand-FileBrowser](https://github.com/Sucharek233/MiBand-FileBrowser) | Lua file browser packaged as a face/app | Lua, no license | 2025-07-21 | **Yes** | Demonstrates full-screen Lua container | Not a conventional watch-face workflow |
| [Pranav-ONLY/Mi-Create-ConvertPlugin](https://github.com/Pranav-ONLY/Mi-Create-ConvertPlugin) | Resize/compress FPRJ projects between modern devices | Python, no declared license | 2025-06-20; release 1.06 | **Likely** (all ~2021+ claimed) | Useful migration/compression helper | Overwrites projects; hangs reported; relies on Mi Create compiler |
| [wahaha1024/xiaomi-watchface-skill](https://github.com/wahaha1024/xiaomi-watchface-skill) | Agent workflow/check scripts for modern `wfDef` editing | PowerShell/docs, no license | 2026-07-07 | No; primarily Band 9 Pro `n67` | Good reverse-engineering checklist and round-trip discipline | AI-assisted skill, not a compiler; model assumptions require validation |
| [kev1nweng/mcwt](https://github.com/kev1nweng/mcwt) | Browser character/digit texture generator | JavaScript, AGPL-3.0 | 2026-01-11 | Device-agnostic | Helpful raster-font generation and baseline alignment | Asset helper only; no package/parser support |
| [Sh1ragami/xiaomi-band-face-editor](https://github.com/Sh1ragami/xiaomi-band-face-editor) | Web editor for custom **background images** | TypeScript, MIT | 2026-01-19 | **Yes**, image sizes for 8/9/10 | Polished web image composition; permissive license | Produces images for official custom-photo feature, not arbitrary dynamic face binaries |
| [m0tral/MiWatchEmulator](https://github.com/m0tral/MiWatchEmulator) | Windows Xiaomi Watch S3 system emulator, EasyFace handoff | Binary distribution, no license | 2025-03-13; release 1.0 | **No fidelity proof for Band 10** | Much closer than a static preview; ADB/system shell | Emulates Watch S3/NuttX environment, not o66 hardware; proprietary bundle |
| [m0tral/MiWatchLuaWatchfaces](https://github.com/m0tral/MiWatchLuaWatchfaces) | Lua face examples for Vela/NuttX devices | Lua, no license | 2025-07-16 | No explicit Band 10 | Advanced script-face reference | Targets Band 8 Pro/Watch S3; firmware/API portability uncertain |

## Installation, protocol, and distribution projects

| Project | Purpose | Language/license | Last update | Band 10 | Pros | Cons |
|---|---|---|---|---|---|---|
| [Gadgetbridge](https://codeberg.org/Freeyourgadget/Gadgetbridge) | Open Android companion, pairing, watch-face file installer/upload | Java, AGPL-3.0 | 2026-07-13; release 0.92.2 2026-07-11 | **Mostly supported** officially in its device docs | Active, privacy-first, full source; exported confirmation installer; Xiaomi upload protocol | Requires AuthKey/pairing migration; no face authoring; per-firmware upload must be tested |
| [matheusdanoite/my-band](https://github.com/matheusdanoite/my-band) | Native iOS Band 10 BLE/protobuf implementation | Swift, no license | 2026-07-02 | **Yes**, hardware-tested core; face install “to confirm” | Excellent independent protocol/packet reference; chunk upload code | Apple-only; AuthKey required; README does not yet confirm face install on hardware |
| [batareya16/MiWearBridge](https://github.com/batareya16/MiWearBridge) | LSPosed hooks into Mi Fitness for face/app/firmware install and Vela bridge | Java, no license | 2026-06-30; release 2.1 | Modern Xiaomi; model matrix must be checked | Direct face picker inside hooked Mi Fitness; logging/key dump | Requires rooted/LSPosed phone; invasive and high-risk; not affiliated with Xiaomi |
| [Mino260806/mi-watchface-uploader](https://github.com/Mino260806/mi-watchface-uploader) | Modified Mi Fitness APK/uploader | APK/binaries, no license | 2023-02-22; release 1.01 2022-11-20 | Unverified | Simple custom-file injection workflow | Old modded proprietary APK; trust/security concerns; no current Band 10 evidence |
| [AstralSightStudios/AstroBox-Repo](https://github.com/AstralSightStudios/AstroBox-Repo) | Community resource index/distribution metadata | Data/docs, no license | 2026-07-14 | **Yes**, `xmb10`/`xmb10nfc` targets | Active distribution ecosystem and adaptation spec | Not a compiler; submission ecosystem/rules; package trust varies by publisher |
| [CheongSzesuen/AstroBooox](https://github.com/CheongSzesuen/AstroBooox) | AstroBox publishing/PR review workbench | TypeScript, no license | 2026-07-14 | Distribution target yes | Modern UI and publishing workflow automation | Publishes resources; does not author/compile the binary |

## Legacy projects (valuable historically, not Band 10 compatible)

| Project | Purpose | Language/license | Last update | Band 10 | Pros | Cons |
|---|---|---|---|---|---|---|
| [stirante/miband-watchface-parser](https://github.com/stirante/miband-watchface-parser) | Mi Band 4 parser/creator experiment | Java, no license | 2022-05-21 | **No** | Small readable early parser | Mi Band 4 format; self-described early stage |
| [v1ack/watchfaceEditor](https://github.com/v1ack/watchfaceEditor) | Web viewer/editor for Bip/Cor/Mi Band 4 disassemblies | JavaScript, GPL-3.0 | 2023-08-14 | **No** | Mature UI/translations; useful rendering ideas | Requires old AmazfitBipTools JSON/images; incompatible binary family |
| [MonsterDruide1/MiBand4-WatchfaceEditor](https://github.com/MonsterDruide1/MiBand4-WatchfaceEditor) | Drag/drop Mi Band 4 editor | Java, no license | 2019-08-30 | **No** | Simple visual builder | Depends on external MiBandWFTool; old format |
| [melianmiko/mibandpreview](https://github.com/melianmiko/mibandpreview) | Desktop preview for Mi Band 4/5/6 | Python/Qt, Apache-2.0 | 2023-04-19 | **No** | Permissive, reusable preview concepts, multiple releases | Old schemas/render model only |
| [lmanul/xiaomi-watchface-maker](https://github.com/lmanul/xiaomi-watchface-maker) | Scripts around AmazfitBipTools | Python, no license | 2020-09-05 | **No** | Source-driven Make-style workflow | Amazfit Bip generation; not Xiaomi's modern format |
| [EddyKuo/amazfitbiptools](https://github.com/EddyKuo/amazfitbiptools) | GitHub mirror of legacy Amazfit Bip pack/unpack tools | C#, no clear mirror license | 2021-01-21 | **No** | Foundational Huami format research | Different magic/schema/device family; original upstream history fragmented |
| [8tm/scripts](https://github.com/8tm/scripts) | Includes a Mi Band 4 asset/project generator | Python, no license | 2022-04-27 | **No** | Automates old sprite/config creation | Delegates to MiBandWFTool; obsolete target |

## Recommendations

1. **Author/preview from source:** this toolkit or Mi Create.
2. **Production comparison build:** user-supplied EasyFace/Mi Create compiler under Wine/Windows, until native o66 output is hardware-verified.
3. **Install:** current Gadgetbridge from Codeberg (not the archived GitHub mirror), or Notify for Xiaomi if Gadgetbridge pairing fails.
4. **Reverse-engineering corpus:** `juzeon/mi-band-faces`, `mb10-goodies`, and `pill-dial`; respect each repository's absent/unclear artwork license.
5. **Do not transplant old Mi Band 4/Bip binary code** into Band 10. The formats are different despite similar watch-face concepts.

No claim of literal completeness is possible: new repositories and private/Telegram tools appear frequently. This catalog covers substantive public projects found by the stated search methodology and deliberately excludes low-value binary collections/forks.

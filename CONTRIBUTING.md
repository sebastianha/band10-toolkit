# Contributing

1. Open an issue describing the device/firmware and evidence source before changing binary semantics.
2. Add a minimal self-authored fixture and tests for every codec/parser change.
3. Preserve unknown bytes; do not assign field meanings from a single unexplained sample.
4. Run `npm run build` and `npm run package` before submitting.
5. State whether a change was browser-tested, structurally tested, closed-compiler compared, or physically tested.

Do not submit proprietary compiler binaries, AuthKeys/tokens, paid/official face dumps, or assets without a clear redistribution license.

Physical test reports should include model/region, firmware, phone/OS, installer/version, package backend/hash, and recovery result.
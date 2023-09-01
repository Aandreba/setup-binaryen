import * as core from "@actions/core"
import * as github from "@actions/github"
import * as cache from "@actions/tool-cache"
import * as assert from "node:assert"
import * as path from "node:path"

async function main() {
    brk: try {
        const token = core.getInput("token", { required: true })
        const octo = github.getOctokit(token)
        let tag: string = core.getInput("version")

        const release = await (tag.length === 0 || tag === "latest"
            ? octo.rest.repos.getLatestRelease({
                  owner: "WebAssembly",
                  repo: "binaryen",
              })
            : octo.rest.repos.getReleaseByTag({
                  owner: "WebAssembly",
                  repo: "binaryen",
                  tag: `version_${tag}`,
              }))

        assert.match(release.data.tag_name, /^version\_/g)
        const version = release.data.tag_name.substring(8)
        core.info(`found Binaryen (version ${version})`)

        let os: string
        switch (process.platform) {
            case "linux":
                os = "linux"
                break
            case "darwin":
                os = "macos"
                break
            case "win32":
            case "cygwin":
                os = "windows"
                break
            default:
                os = process.platform
                core.warning(`unknown platform "${process.platform}"`)
        }

        let arch: string
        switch (process.arch) {
            case "arm64":
                arch = "arm64"
                break
            case "x64":
                arch = "x86_64"
                break
            default:
                arch = process.arch
                core.warning(`unknown architecture "${process.arch}"`)
        }

        const target = `${arch}-${os}`
        core.info(`target platform: ${target}`)
        const end = `${target}.tar.gz`

        const cachedPath = cache.find("binaryen", version, target)
        if (cachedPath.length > 0) {
            core.info("cached version of binaryen found")
            core.addPath(cachedPath)
            break brk
        }

        for (let asset of release.data.assets) {
            if (!asset.name.endsWith(end)) continue
            core.info(`found matching asset: ${asset.name}`)

            const tarball = await cache.downloadTool(asset.browser_download_url)
            const extracted = await cache.extractTar(tarball)
            const cached = await cache.cacheDir(
                path.join(extracted, `binaryen-${release.data.tag_name}`),
                "binaryen",
                version,
                target
            )

            core.addPath(cached)
            break brk
        }

        throw new Error(`binaries for target "${target}" not found`)
    } catch (e) {
        core.setFailed(e instanceof Error ? e : "unknown error kind")
    }
}

main()

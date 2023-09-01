"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _core = /*#__PURE__*/ _interop_require_wildcard(require("@actions/core"));
const _github = /*#__PURE__*/ _interop_require_wildcard(require("@actions/github"));
const _toolcache = /*#__PURE__*/ _interop_require_wildcard(require("@actions/tool-cache"));
const _nodeassert = /*#__PURE__*/ _interop_require_wildcard(require("node:assert"));
const _nodepath = /*#__PURE__*/ _interop_require_wildcard(require("node:path"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
async function main() {
    brk: try {
        const token = _core.getInput("token", {
            required: true
        });
        const octo = _github.getOctokit(token);
        let tag = _core.getInput("version");
        const release = await (tag.length === 0 || tag === "latest" ? octo.rest.repos.getLatestRelease({
            owner: "WebAssembly",
            repo: "binaryen"
        }) : octo.rest.repos.getReleaseByTag({
            owner: "WebAssembly",
            repo: "binaryen",
            tag: `version_${tag}`
        }));
        _nodeassert.match(release.data.tag_name, /^version\_/g);
        const version = release.data.tag_name.substring(8);
        _core.info(`found Binaryen (version ${version})`);
        let os;
        switch(process.platform){
            case "linux":
                os = "linux";
                break;
            case "darwin":
                os = "macos";
                break;
            case "win32":
            case "cygwin":
                os = "windows";
                break;
            default:
                os = process.platform;
                _core.warning(`unknown platform "${process.platform}"`);
        }
        let arch;
        switch(process.arch){
            case "arm64":
                arch = "arm64";
                break;
            case "x64":
                arch = "x86_64";
                break;
            default:
                arch = process.arch;
                _core.warning(`unknown architecture "${process.arch}"`);
        }
        const target = `${arch}-${os}`;
        _core.info(`target platform: ${target}`);
        const end = `${target}.tar.gz`;
        const cachedPath = _toolcache.find("binaryen", version, target);
        if (cachedPath.length > 0) {
            _core.info("cached version of binaryen found");
            _core.addPath(cachedPath);
            break brk;
        }
        for (let asset of release.data.assets){
            if (!asset.name.endsWith(end)) continue;
            _core.info(`found matching asset: ${asset.name}`);
            const tarball = await _toolcache.downloadTool(asset.browser_download_url);
            const extracted = await _toolcache.extractTar(tarball);
            const cached = await _toolcache.cacheDir(_nodepath.join(extracted, `binaryen-${release.data.tag_name}`), "binaryen", version, target);
            _core.info(`${tarball}\n${extracted}\n${cached}\n${_nodepath.join(extracted, `binaryen-${release.data.tag_name}`)}`);
            _core.addPath(cached);
            break brk;
        }
        throw new Error(`binaries for target "${target}" not found`);
    } catch (e) {
        _core.setFailed(e instanceof Error ? e : "unknown error kind");
    }
}
main();

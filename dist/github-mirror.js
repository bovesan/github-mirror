#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = __importDefault(require("child_process"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var os_1 = __importDefault(require("os"));
var readline = __importStar(require("readline"));
var https_1 = __importDefault(require("https"));
var credentialsPath = path_1.default.join(os_1.default.homedir(), '.github-mirror');
var description = "Usage:\n" + path_1.default.basename(process.argv[1]) + " destinationFolder\n\nCredentials must be specified:\n" + credentialsPath + "\nUSERNAME=<github-username>\nTOKEN=<personal-access-token>";
String.prototype.hashCode = function () {
    var hash = 0, i, chr;
    if (this.length === 0)
        return hash;
    for (i = 0; i < this.length; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};
var destinationFolder = process.argv[2];
if (!destinationFolder) {
    console.error(description);
    console.error("Destination folder not specified");
    process.exit(1);
}
if (!fs_1.default.existsSync(credentialsPath)) {
    console.error(description);
    console.error("Credentials file not present: " + credentialsPath);
    process.exit(2);
}
var newline = /(\r\n|[\n\v\f\r\x85\u2028\u2029])/;
var username = '';
var token = '';
for (var _i = 0, _a = fs_1.default.readFileSync(credentialsPath, 'utf8').split(newline); _i < _a.length; _i++) {
    var line = _a[_i];
    var match = line.match(/(\S+)\s*\=\s*(.*)/);
    if (match) {
        var _b = match.splice(1), key = _b[0], value = _b[1];
        switch (key.toLowerCase()) {
            case 'username':
                username = value;
            case 'token':
                token = value;
        }
    }
}
if (!username) {
    console.error(description);
    console.error("Username not specified in " + credentialsPath);
    process.exit(3);
}
if (!token) {
    console.error(description);
    console.error("Token not specified in " + credentialsPath);
    process.exit(4);
}
function simpleFetch(url) {
    return new Promise(function (resolve, reject) {
        https_1.default.get(url, {
            auth: username + ":" + token,
            headers: {
                'User-Agent': 'github-mirror / 1.0'
            },
        }, function (res) {
            res.setEncoding("utf8");
            var body = "";
            res.on("data", function (data) {
                body += data;
            });
            res.on("end", function () {
                resolve(body);
            });
        });
    });
}
function fetchReposPage(page) {
    var url = "https://api.github.com/users/" + username + "/repos?per_page=100&page=" + page;
    console.log('Fetching ' + url);
    return simpleFetch(url).then(function (body) { return JSON.parse(body); });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var repos, page, pageEmpty, pageRepos, _i, repos_1, repo, repoFolder, repoPath, wikiPath, issuesPath, statusString, repoProcess, issuesFailed, issues, error_1, oldHash, wikiProcess, _loop_1, _a, _b, entry;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    repos = [];
                    page = 0;
                    pageEmpty = false;
                    _c.label = 1;
                case 1:
                    if (!!pageEmpty) return [3 /*break*/, 3];
                    page += 1;
                    return [4 /*yield*/, fetchReposPage(page)];
                case 2:
                    pageRepos = _c.sent();
                    console.log("Got " + pageRepos.length + " more repos");
                    if (!pageRepos.length) {
                        return [3 /*break*/, 3];
                    }
                    repos.push.apply(repos, pageRepos);
                    return [3 /*break*/, 1];
                case 3:
                    console.log("User has " + repos.length + " repositories");
                    _i = 0, repos_1 = repos;
                    _c.label = 4;
                case 4:
                    if (!(_i < repos_1.length)) return [3 /*break*/, 10];
                    repo = repos_1[_i];
                    repoFolder = path_1.default.join(destinationFolder, repo.name);
                    repoPath = path_1.default.join(repoFolder, repo.name + ".git");
                    wikiPath = path_1.default.join(repoFolder, repo.name + ".wiki.git");
                    issuesPath = path_1.default.join(repoFolder, repo.name + ".issues.json");
                    statusString = repo.name.padEnd(32) + " ";
                    process.stdout.write(statusString + 'Cloning repository ...');
                    repoProcess = child_process_1.default.spawnSync('git', ['clone', '--quiet', '--mirror', "https://" + username + ":" + token + "@github.com/" + username + "/" + repo.name + ".git", repoPath]);
                    if (repoProcess.status === 128) {
                        statusString += "Repository: OK".padEnd(24);
                    }
                    else if (repoProcess.status) {
                        statusString += ("Repository: FAILED (" + repoProcess.status + ")").padEnd(24);
                    }
                    else {
                        statusString += 'Repository: UPDATED'.padEnd(24);
                    }
                    readline.clearLine(process.stdout, 0);
                    readline.cursorTo(process.stdout, 0);
                    process.stdout.write(statusString + 'Fetching issues ...');
                    issuesFailed = false;
                    issues = '';
                    _c.label = 5;
                case 5:
                    _c.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, simpleFetch("https://api.github.com/repos/" + username + "/" + repo.name + "/issues")];
                case 6:
                    issues = _c.sent();
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _c.sent();
                    issuesFailed = true;
                    return [3 /*break*/, 8];
                case 8:
                    if (issuesFailed) {
                        statusString += 'Issues: FAILED'.padEnd(24);
                    }
                    else {
                        oldHash = fs_1.default.readFileSync(issuesPath, 'utf8').hashCode();
                        if (issues.hashCode() == oldHash) {
                            statusString += 'Issues: OK'.padEnd(24);
                        }
                        else {
                            fs_1.default.writeFileSync(issuesPath, issues);
                            statusString += 'Issues: UPDATED'.padEnd(24);
                        }
                    }
                    readline.clearLine(process.stdout, 0);
                    readline.cursorTo(process.stdout, 0);
                    process.stdout.write(statusString + 'Cloning wiki ...');
                    wikiProcess = child_process_1.default.spawnSync('git', ['clone', '--quiet', '--mirror', "https://" + username + ":" + token + "@github.com/" + username + "/" + repo.name + ".wiki.git", wikiPath]);
                    if (wikiProcess.status === 128) {
                        // statusString += 'Wiki: NONE'.padEnd(24)
                    }
                    else if (wikiProcess.status) {
                        statusString += 'Wiki: FAILED'.padEnd(24);
                    }
                    else {
                        statusString += 'Wiki: OK'.padEnd(24);
                    }
                    readline.clearLine(process.stdout, 0);
                    readline.cursorTo(process.stdout, 0);
                    process.stdout.write(statusString + '\n');
                    _c.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 4];
                case 10:
                    _loop_1 = function (entry) {
                        if (entry.isDirectory() && !repos.find(function (repo) { return repo.name === entry.name; })) {
                            var statusString = entry.name.padEnd(32) + " No longer on GitHub. ";
                            process.stdout.write(statusString + 'Removing ...');
                            var repoProcess = child_process_1.default.spawnSync('rm', ['-rvf', path_1.default.join(destinationFolder, entry.name)]);
                            if (repoProcess.status) {
                                statusString += 'REMOVAL FAILED';
                            }
                            else {
                                statusString += 'REMOVED';
                            }
                            readline.clearLine(process.stdout, 0);
                            readline.cursorTo(process.stdout, 0);
                            process.stdout.write(statusString);
                            process.stdout.write(statusString + '\n');
                        }
                    };
                    for (_a = 0, _b = fs_1.default.readdirSync(destinationFolder, { withFileTypes: true }); _a < _b.length; _a++) {
                        entry = _b[_a];
                        _loop_1(entry);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
main();

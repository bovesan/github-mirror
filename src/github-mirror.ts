#!/usr/bin/env node

import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';

const description = `Usage:
${path.basename(process.argv[1])} credentialsFile destinationFolder

Credentials must be a file like this:
USERNAME=<github-username>
TOKEN=<personal-access-token>`

const errors = {
    credentialsFileNotSpecified: 2,
    destinationFolderNotSpecified: 3,
    credentialsFileNotFound: 4,
    usernameNotSpecified: 5,
    tokenNotSpecified: 6,
    gitCommandNotAvailable: 7,
}

declare global {
  interface String {
    hashCode: () => number;
  }
}

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

const credentialsPath = process.argv[2];
if (!credentialsPath){
    console.error(`Credentials file not specified`);
    console.error(description);
    process.exit(errors.credentialsFileNotSpecified);
}
const destinationFolder = process.argv[3];
if (!destinationFolder){
    console.error(`Destination folder not specified`);
    console.error(description);
    process.exit(errors.destinationFolderNotSpecified);
}
if (!fs.existsSync(credentialsPath)){
    console.error(`Credentials file not present: ${credentialsPath}`);
    console.error(description);
    process.exit(errors.credentialsFileNotFound);
}
const newline = /(\r\n|[\n\v\f\r\x85\u2028\u2029])/
let username = '';
let token = '';
for (let line of fs.readFileSync(credentialsPath, 'utf8').split(newline)){
    const match = line.match(/(\S+)\s*\=\s*(.*)/);
    if (match){
        const [key, value] = match.splice(1);
        switch (key.toLowerCase()){
            case 'username':
                username = value;
            case 'token':
                token = value;
        }
    }
}
if (!username){
    console.error(`Username not specified in ${credentialsPath}`);
    console.error(description);
    process.exit(errors.usernameNotSpecified);
}
if (!token){
    console.error(`Token not specified in ${credentialsPath}`);
    console.error(description);
    process.exit(errors.tokenNotSpecified);
}

function simpleFetch(url: string): Promise<string>{
    return new Promise((resolve, reject) => {
        https.get(url, {
            auth: `${username}:${token}`,
            headers: {
                'User-Agent': 'github-mirror / 1.0'
            },
        }, res => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => {
                body += data;
            });
            res.on("end", () => {
                resolve(body);
            });
        });
    });
}
function fetchReposPage(page: number): Promise<GitHubRepo[]>{
    const url = `https://api.github.com/user/repos?per_page=100?sort=full_name&type=all&page=${page}`;
    // console.log('Fetching '+url);
    return simpleFetch(url).then(body => JSON.parse(body));
}
async function main(){
    const repos = [];
    let page = 0;
    let pageEmpty = false;
    while (!pageEmpty){
        page += 1;
        let pageRepos = await fetchReposPage(page);
        // console.log(`Got ${pageRepos.length} more repos`);
        if (!pageRepos.length){
            break;
        }
        repos.push(...pageRepos);
    }
    console.log(`User has ${repos.length} repositories`);
    for (let repo of repos){
        const repoFolder = path.join(destinationFolder, repo.name);
        const repoPath = path.join(repoFolder, `${repo.name}.git`);
        const wikiPath = path.join(repoFolder, `${repo.name}.wiki.git`);
        const issuesPath = path.join(repoFolder, `${repo.name}.issues.json`);
        process.stdout.write(`${repo.name.padEnd(32)} Repository: `);
        const repoProcess = child_process.spawnSync('git', ['clone', '--quiet', '--mirror', `https://${username}:${token}@github.com/${username}/${repo.name}.git`, repoPath]);
        if (repoProcess.error){
            if (repoProcess.error.message.endsWith('ENOENT')){
                console.error('ERROR\ngit command not available');
                process.exit(errors.gitCommandNotAvailable);
            }
            throw repoProcess.error;
        } else if (repoProcess.status === 128){
            process.stdout.write('OK'.padEnd(12));
        } else if (repoProcess.status){
            process.stdout.write(`FAILED (${repoProcess.status})`.padEnd(12));
        } else {
            process.stdout.write('UPDATED'.padEnd(12));
        }
        process.stdout.write('Issues: ');
        let issuesFailed = false;
        let issues = '';
        try{
            issues = await simpleFetch(`https://api.github.com/repos/${username}/${repo.name}/issues`);
        } catch (error) {
            issuesFailed = true;
        }
        if (issuesFailed){
            process.stdout.write('FAILED'.padEnd(12));
        } else {
            let oldHash = 0;
            try{
                oldHash = fs.readFileSync(issuesPath, 'utf8').hashCode();
            } catch (error) {
                //
            }
            if (issues.hashCode() == oldHash){
                process.stdout.write('OK'.padEnd(12));
            } else {
                fs.writeFileSync(issuesPath, issues);
                process.stdout.write('UPDATED'.padEnd(12));
            }
        }
        process.stdout.write('Wiki: ');
        const wikiProcess = child_process.spawnSync('git', ['clone', '--quiet', '--mirror', `https://${username}:${token}@github.com/${username}/${repo.name}.wiki.git`, wikiPath])
        if (wikiProcess.status === 128){
            process.stdout.write('OK'.padEnd(12));
        } else if (wikiProcess.status){
            process.stdout.write(`FAILED (${repoProcess.status})`.padEnd(12));
        } else {
            process.stdout.write('UPDATED'.padEnd(12));
        }
        process.stdout.write('\n');
    }
    for (let entry of fs.readdirSync(destinationFolder, {withFileTypes: true})){
        if (entry.isDirectory() && !repos.find(repo => repo.name === entry.name)){
            process.stdout.write(`${entry.name.padEnd(32)} No longer on GitHub. `);
            const repoProcess = child_process.spawnSync('rm', ['-rvf', path.join(destinationFolder, entry.name)]);
            if (repoProcess.status){
                process.stdout.write('REMOVAL FAILED');
            } else {
                process.stdout.write('REMOVED');
            }
            process.stdout.write('\n');
        }
    }
}
main();

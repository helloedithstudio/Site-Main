// Facts the Showcase page states about itself, measured from the repository at build time so none of them is typed by
// hand: how many commits made the site, when the first one landed, the size of its WebGL assets, how many Blender models
// it ships, how many automated checks the join flow has, and two real code excerpts.
//
//   node scripts/build-facts.cjs          (also runs before every `npm run build`)
//
// Writes lib/showcase.build.json. On a shallow clone (Vercel clones only recent history) the git numbers would be wrong,
// so they are kept from the committed file and only the rest is refreshed.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const WEB = path.resolve(__dirname, "..");
const OUT = path.join(WEB, "lib", "showcase.build.json");

const read = (rel) => fs.readFileSync(path.join(WEB, rel), "utf8");
const git = (...args) => execFileSync("git", args, { cwd: WEB, encoding: "utf8" }).trim();

function previous() {
  try {
    return JSON.parse(fs.readFileSync(OUT, "utf8"));
  } catch {
    return null;
  }
}

/** Commits that touched the site folder (the repository also holds an older, unrelated history). */
function gitFacts() {
  try {
    if (git("rev-parse", "--is-shallow-repository") === "true") return null;
    const dates = git("log", "--format=%cs", "--", ".").split("\n").filter(Boolean);
    if (!dates.length) return null;
    return { commits: dates.length, firstCommit: dates[dates.length - 1], lastCommit: dates[0] };
  } catch {
    return null;
  }
}

function dirBytes(dir, filter = () => true) {
  let total = 0;
  let files = 0;
  if (!fs.existsSync(dir)) return { total, files };
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = dirBytes(p, filter);
      total += sub.total;
      files += sub.files;
    } else if (filter(entry.name)) {
      total += fs.statSync(p).size;
      files += 1;
    }
  }
  return { total, files };
}

/**
 * A block of real source: the lines from the first one matching `start` to the line where its braces close again.
 * Leading indentation is removed so it reads well on the page.
 */
function excerpt(rel, start) {
  const lines = read(rel).split(/\r?\n/);
  const from = lines.findIndex((l) => start.test(l));
  if (from < 0) throw new Error(`build-facts: ${start} not found in ${rel}`);
  let depth = 0;
  let opened = false;
  let to = from;
  for (let i = from; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") {
        depth++;
        opened = true;
      } else if (ch === "}") depth--;
    }
    if (opened && depth <= 0) {
      to = i;
      break;
    }
  }
  const block = lines.slice(from, to + 1);
  const indent = Math.min(...block.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return { file: `web/${rel.replace(/\\/g, "/")}`, startLine: from + 1, endLine: to + 1, code: block.map((l) => l.slice(indent)).join("\n") };
}

const pkg = JSON.parse(read("package.json"));
const version = (name) => (pkg.dependencies[name] || pkg.devDependencies?.[name] || "").replace(/^[^\d]*/, "");

const fromGit = gitFacts();
const kept = previous()?.git ?? null;

const facts = {
  generated: new Date().toISOString().slice(0, 10),
  git: fromGit ?? kept,
  versions: { next: version("next"), react: version("react"), three: version("three"), gsap: version("gsap"), lenis: version("lenis") },
  webgl: {
    bytes: dirBytes(path.join(WEB, "public", "gl")).total + dirBytes(path.join(WEB, "public", "showcase", "gl")).total,
    blenderModels: dirBytes(path.join(WEB, "public", "gl", "models"), (n) => n.endsWith(".glb")).files + dirBytes(path.join(WEB, "public", "showcase", "gl"), (n) => n.endsWith(".glb")).files,
  },
  join: {
    checks: (read("scripts/join-test.ts").match(/await t\(/g) || []).length,
    maxRemovalsPerRun: Number((read("lib/join/sweep.ts").match(/MAX_KICKS_PER_RUN\s*=\s*(\d+)/) || [])[1]) || null,
  },
  excerpts: {
    "header-spring": excerpt("components/HeaderNav.tsx", /const onTick = /),
    "join-claim": excerpt("lib/join/store.ts", /async claim\(d, g\)/),
  },
};

if (!facts.git) console.warn("build-facts: no git history available and no earlier file to keep; git facts left empty");
fs.writeFileSync(OUT, JSON.stringify(facts, null, 2) + "\n");
console.log(`build-facts: wrote ${path.relative(WEB, OUT)} (${facts.git ? `${facts.git.commits} commits since ${facts.git.firstCommit}` : "no git facts"})`);

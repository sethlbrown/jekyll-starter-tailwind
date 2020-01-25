import autoprefixer from "autoprefixer";
import browserSync from "browser-sync";
import { spawn } from "child_process";
import cssnano from "cssnano";
import { dest, series, src, task, watch } from "gulp";
import postcss from "gulp-postcss";
import purgecss from "@fullhuman/postcss-purgecss";
import atimport from "postcss-import";
import tailwindcss from "tailwindcss";

const SITE_ROOT = "./_site";
const POST_BUILD_STYLESHEET = `${SITE_ROOT}/assets/css/`;
const PRE_BUILD_STYLESHEET = "./src/style.css";
const TAILWIND_CONFIG = "./tailwind.config.js";

const DEVELOPMENT_ENVIRONMENT = "development";
const environment = process.env.NODE_ENV || DEVELOPMENT_ENVIRONMENT;
const isDevelopmentBuild = environment === DEVELOPMENT_ENVIRONMENT;

// Fix for Windows compatibility
const JEKYLL = process.platform === "win32" ? "jekyll.bat" : "jekyll";

// Custom PurgeCSS Extractor for Tailwind CSS
const purgeFromTailwind = content => content.match(/[\w-/:]+(?<!:)/g) || [];

task("buildJekyll", () => {
  browserSync.notify("Building Jekyll site...");

  const args = ["exec", JEKYLL, "build"];

  if (isDevelopmentBuild) {
    args.push("--incremental");
  }

  return spawn("bundle", args, { stdio: "inherit" });
});

task("processStyles", () => {
  browserSync.notify("Compiling styles...");

  return src(PRE_BUILD_STYLESHEET)
    .pipe(
      postcss([
        atimport(),
        tailwindcss(TAILWIND_CONFIG),
        ...(!isDevelopmentBuild
          ? [
              purgecss({
                content: [`${SITE_ROOT}/**/*.html`],
                extractors: [
                  {
                    extractor: purgeFromTailwind,
                    extensions: ["html", "js"]
                  }
                ]
              }),
              autoprefixer(),
              cssnano()
            ]
          : [])
      ])
    )
    .pipe(dest(POST_BUILD_STYLESHEET));
});

task("startServer", () => {
  browserSync.init({
    files: [SITE_ROOT + "/**"],
    open: "local",
    port: 4000,
    server: {
      baseDir: SITE_ROOT,
      serveStaticOptions: {
        extensions: ["html"]
      }
    }
  });

  watch(
    [
      "**/*.css",
      "**/*.html",
      "**/*.js",
      "**/*.md",
      "**/*.markdown",
      "!_site/**/*",
      "!node_modules/**/*"
    ],
    { interval: 500 },
    buildSite
  );
});

const buildSite = series("buildJekyll", "processStyles");

exports.serve = series(buildSite, "startServer");
exports.default = series(buildSite);

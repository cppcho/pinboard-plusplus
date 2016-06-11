const babelify = require('babelify');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const cssnano = require('gulp-cssnano');
const del = require('del');
const gulp = require('gulp');
const gutil = require('gulp-util');
const htmlmin = require('gulp-htmlmin');
const jsonMinify = require('gulp-json-minify');
const merge = require('merge-stream');
const source = require('vinyl-source-stream');
const uglify = require('gulp-uglify');
const zip = require('gulp-zip');

function processJsFile(fileName, debug) {
  // https://github.com/gulpjs/gulp/blob/master/docs/recipes/browserify-uglify-sourcemap.md

  let uglifyConfigs = {};

  // remove console.log if debug is false
  if (!debug) {
    uglifyConfigs = {
      compress: {
        pure_funcs: [
          'console.log',
          'console.error',
        ],
      },
    };
  }

  const b = browserify({
    entries: `src/js/${fileName}.js`,
  }).transform(babelify.configure({
    presets: ['es2015'],
  })).bundle()
    .on('error', gutil.log)
    .pipe(source(`${fileName}.js`))
    .pipe(buffer());
  if (!debug) {
    b.pipe(uglify(uglifyConfigs));
  }
  return b.pipe(gulp.dest('dist/js'));
}

function buildJs(debug) {
  return merge(
    processJsFile('eventPage', debug),
    processJsFile('options', debug),
    processJsFile('popup', debug),
    processJsFile('content-google', debug),
    processJsFile('content-duckduckgo', debug)
  );
}

function buildCss() {
  return gulp.src('src/css/*.css')
    .pipe(cssnano())
    .on('error', gutil.log)
    .pipe(gulp.dest('dist/css'));
}

function buildHtml() {
  return gulp.src('src/html/*.html')
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true,
    }))
    .on('error', gutil.log)
    .pipe(gulp.dest('dist/html'));
}

function buildManifest() {
  return gulp.src([
    'src/manifest.json',
  ]).pipe(jsonMinify())
    .pipe(gulp.dest('dist'));
}

function buildImg() {
  return gulp.src([
    'src/img/*',
  ]).pipe(gulp.dest('dist/img'));
}

function buildMisc() {
  const jqueryjs = gulp.src([
    'node_modules/jquery/dist/jquery.min.js',
  ]).pipe(gulp.dest('src/js/lib'))
    .pipe(gulp.dest('dist/js/lib'));

  const tooltipsterjs = gulp.src([
    'src/js/lib/jquery.tooltipster.min.js',
  ]).pipe(gulp.dest('dist/js/lib'));

  const tooltipstercss = gulp.src([
    'src/css/lib/tooltipster.css',
  ]).pipe(cssnano())
    .pipe(gulp.dest('dist/css/lib'));

  return merge(
    jqueryjs,
    tooltipsterjs,
    tooltipstercss
  );
}

gulp.task('js', () => buildJs(false));

gulp.task('js:debug', () => buildJs(true));

gulp.task('css', () => buildCss());

gulp.task('html', () => buildHtml());

gulp.task('manifest', () => buildManifest());

gulp.task('img', () => buildImg());

gulp.task('misc', () => buildMisc());

gulp.task('build', ['clean'], () => (
  merge(
    buildJs(false),
    buildCss(),
    buildHtml(),
    buildImg(),
    buildManifest(),
    buildMisc()
  )
));

gulp.task('build:debug', ['clean'], () => (
  merge(
    buildJs(true),
    buildCss(),
    buildHtml(),
    buildImg(),
    buildManifest(),
    buildMisc()
  )
));

gulp.task('zip', ['build'], () => (
  gulp.src('dist/**')
    .pipe(zip('archive.zip'))
    .pipe(gulp.dest('.'))
));

gulp.task('clean', () => del(['dist/**', 'archive/**', 'archive.zip']));

gulp.task('watch', () => {
  gulp.watch('src/js/*.js', ['js']);
  gulp.watch('src/css/*.css', ['css']);
  gulp.watch('src/html/*.html', ['html']);
  gulp.watch('src/img/*', ['img']);
  gulp.watch('src/manifest.json', ['manifest']);
});

gulp.task('watch:debug', () => {
  gulp.watch('src/js/*.js', ['js:debug']);
  gulp.watch('src/css/*.css', ['css']);
  gulp.watch('src/html/*.html', ['html']);
  gulp.watch('src/img/*', ['img']);
  gulp.watch('src/manifest.json', ['manifest']);
});

gulp.task('default', ['zip']);

const babelify = require('babelify');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const cssnano = require('gulp-cssnano');
const del = require('del');
const gulp = require('gulp');
const gutil = require('gulp-util');
const htmlmin = require('gulp-htmlmin');
const jsonMinify = require('gulp-json-minify');
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
  b.pipe(gulp.dest('dist/js'));
}

function buildJs(debug) {
  processJsFile('eventPage', debug);
  processJsFile('options', debug);
  processJsFile('popup', debug);
  processJsFile('content-google', debug);
  processJsFile('content-duckduckgo', debug);
}

function buildCss() {
  gulp.src('src/css/*.css')
    .pipe(cssnano())
    .on('error', gutil.log)
    .pipe(gulp.dest('dist/css'));
}

function buildHtml() {
  gulp.src('src/html/*.html')
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true,
    }))
    .on('error', gutil.log)
    .pipe(gulp.dest('dist/html'));
}

function buildManifest() {
  gulp.src([
    'src/manifest.json',
  ]).pipe(jsonMinify())
    .pipe(gulp.dest('dist'));
}

function buildImg() {
  gulp.src([
    'src/img/*',
  ]).pipe(gulp.dest('dist/img'));
}

function buildMisc() {
  gulp.src([
    'node_modules/jquery/dist/jquery.min.js',
  ]).pipe(gulp.dest('src/js/lib'))
    .pipe(gulp.dest('dist/js/lib'));

  gulp.src([
    'src/js/lib/jquery.tooltipster.min.js',
  ]).pipe(gulp.dest('dist/js/lib'));

  gulp.src([
    'src/css/lib/tooltipster.css',
  ]).pipe(cssnano())
    .pipe(gulp.dest('dist/css/lib'));
}

gulp.task('js', () => {
  buildJs(false);
});

gulp.task('js:debug', () => {
  buildJs(true);
});

gulp.task('css', () => {
  buildCss();
});

gulp.task('html', () => {
  buildHtml();
});

gulp.task('manifest', () => {
  buildManifest();
});

gulp.task('img', () => {
  buildImg();
});

gulp.task('misc', () => {
  buildMisc();
});

gulp.task('build', ['clean'], () => {
  buildJs(false);
  buildCss();
  buildHtml();
  buildManifest();
  buildImg();
  buildMisc();
});

gulp.task('zip', () => {
  gulp.src('dist/**')
    .pipe(zip('archive.zip'))
    .pipe(gulp.dest('.'));
});

gulp.task('build:debug', ['clean'], () => {
  buildJs(true);
  buildCss();
  buildHtml();
  buildManifest();
  buildImg();
  buildMisc();
});

gulp.task('clean', () =>
  del([
    'dist/**',
  ])
);

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

gulp.task('default', ['build']);

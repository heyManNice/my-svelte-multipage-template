import { spawn } from 'child_process';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import css from 'rollup-plugin-css-only';
import fs from 'fs';
import cleancss from 'clean-css';

const production = !process.env.ROLLUP_WATCH;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

function assembledHtml(pageName){
    return {
        writeBundle: function(options, bundle) {
            let templateHtml = fs.readFileSync('src/template.html', 'utf8');
            let globalCss = fs.readFileSync('src/global.css', 'utf8');

            let css = fs.readFileSync(`public/${pageName}.css`, 'utf8');
            fs.unlinkSync(`public/${pageName}.css`);
            let js = fs.readFileSync(`public/${pageName}.html`, 'utf8');

            let html = templateHtml
            .replace('<!-- title -->', ()=>{
                return `<title>${pageName}</title>`
            })
            .replace('<!-- style -->', ()=>{
                return `<style>${new cleancss().minify(globalCss).styles+css}</style>`
            })
            .replace('<!-- script -->', ()=>{
                return `<script id="svelteScript">${js}svelteScript.remove()</script>`
            });
            
            fs.writeFileSync(`public/${pageName}.html`, html);

            //复制src/assets文件夹
            if (fs.existsSync('src/assets')) {
                fs.cpSync('src/assets', 'public/assets', { recursive: true });
            }
        }
    };
}

function generateConfigs() {
    let srcDirs = fs.readdirSync('src/pages').filter((file) => fs.lstatSync(`src/pages/${file}`).isDirectory());
    let result = [];
    for(let dir of srcDirs){
        const isLast = srcDirs.indexOf(dir) === srcDirs.length - 1;
        let pageName = dir;
        let config = {
            plugins: [
                svelte({
                    compilerOptions: {
                        dev: !production
                    }
                }),
                resolve({
                    browser: true,
                    dedupe: ['svelte'],
                    exportConditions: ['svelte']
                }),
                commonjs(),
                terser(),
                css({ output: pageName+'.css' }),
                assembledHtml(pageName),
                isLast && !production && serve(),
                isLast && !production && livereload('public')
            ],
            watch: {
                clearScreen: false
            },
            input:`src/pages/${pageName}/main.js`,
            output: {
                sourcemap: false,
                format: 'iife',
                name: dir,
                file: `public/${pageName}.html`
            }
        }
        result.push(config);
    }
    return result;
}

export default generateConfigs()

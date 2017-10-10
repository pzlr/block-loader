'use strict';

const
	path = require('path'),
	fs = require('fs-extra-promise'),
	core = require('@pzlr/build-core'),
	loaderUtils = require('loader-utils');

const preferences = {
	static: ['.ess', '.styl'],
	ts: ['.ess', '.ss', '.styl', '.ts'],
	js: ['.ess', '.ss', '.styl', '.js']
};

const scripts = {
	'.ts': true,
	'.js': true
};

/**
 * Returns include declaration for the specified package
 *
 * @param {string} dir - source directory
 * @param {string} name - package name
 * @param {string} ext - file extension
 * @param {string} type - package type
 * @returns {string}
 */
async function include(dir, name, ext, type) {
	if (!scripts[ext] && type === 'interface') {
		return '';
	}

	try {
		if ((await fs.statAsync(path.join(dir, name + ext))).isFile()) {
			return `require('./${name + ext}');`;
		}

	} catch (ignore) {}

	return '';
}

/**
 * Returns escaped path
 * (fix for windows)
 *
 * @param {string} path
 * @returns {string}
 */
function escapePath(path) {
	return JSON.stringify(path).slice(1, -1);
}

/**
 * @param source
 * @returns {string}
 */
async function main(source) {
	const
		query = loaderUtils.getOptions(this),
		projectType = query.projectType || core.config.projectType,
		fileExts = query.exts || preferences[projectType],
		requireLibs = 'libs' in query ? query.libs : true,
		declaration = core.declaration.parse(source, true);

	if (!declaration) {
		return source;
	}

	this.addContextDependency(this.context);

	const
		{name, type, parent, dependencies, libs} = declaration;

	let res = parent ? `require('${escapePath(core.resolve.block(parent, name))}');\n` : '';
	res += dependencies
		.map((dep) => `require('${escapePath(core.resolve.block(dep, name))}');`)
		.join('\n');

	if (requireLibs) {
		res += libs.map((lib) => `require('${escapePath(lib)}');`).join('\n');
	}

	res += '\n';

	const fileDeps = await $C(fileExts).async.reduce(
		(res, ext, i, data, o) => {
			o.wait(async () => {
				res[i] = await include(this.context, name, ext, type);
			});

			return res;
		},

		[]
	);
	res += fileDeps.join('\n');

	return res;
}

module.exports = function (...args) {
	const callback = this.async();

	main
		.call(this, ...args)
		.then((v) => callback(null, v), callback);
};

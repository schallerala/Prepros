/**
 * Prepros
 * (c) Subash Pathak
 * sbshpthk@gmail.com
 * License: MIT
 */

/*jshint browser: true, node: true, loopfunc: true*/
/*global prepros, _*/

//Imports Visitor
prepros.factory('importsVisitor', function (utils) {

    'use strict';

    var fs = require('fs-extra'),
        path = require('path');

    //Function to get files list imported by another file; returns the list of imported files that exist
    function visitImports(filePath, projectPath) {

        var can = ['less', 'sass', 'scss', 'jade', 'styl', 'slim', 'js', 'coffee'];

        if(!_.contains(can, path.extname(filePath).slice(1))) {

            return [];
        }

        var importedFiles = [],
            ext = path.extname(filePath).toLowerCase(),
            data = fs.readFileSync(filePath).toString(),
            result,
            basedir = path.dirname(filePath),
            importedFilePath,
            importReg;

        //Strip Comments
        if (ext !== '.js') {
            data = data.replace(/\/\*.+?\*\/|\/\/.*(?=[\n\r])/g, '');
            data = data.replace(/\/\/.*/g, '');
        }


        if (ext === '.less') {
            importReg = /@import\s+[url\('"]*(.*)["'\)]/g;
        }
        if (ext === '.scss') {
            importReg = /@import\s['"]*([^;]+)[;"']/g;
        }
        if (ext === '.sass') {
            importReg = /@import\s+(.*)/g;
        }
        if (ext === '.styl') {
            importReg = /@import\s["'\(]*([^"';\n\)]+)[;\)"']/g;
        }
        if (ext === '.jade') {
            importReg = /(?:include|extends)\s+(.*)/g;
        }
        if (ext === '.slim') {
            importReg = /\==\sSlim::Template.new\(['"]*([^\n"']+)['"]\).render/g;
        }
        if (ext === '.js') {
            importReg = /\/\/(?:\s|)@(?:prepros|codekit)-(?:append|prepend)\s+(.*)/gi;
        }
        if (ext === '.coffee') {
            importReg = /#(?:\s|)@(?:prepros|codekit)-(?:append|prepend)\s+(.*)/gi;
        }
        //Automatically add extension
        var autoExt = ['.less', '.styl', '.jade'];

        if (ext !== '.sass' && ext !== '.scss') {

            while ((result = importReg.exec(data)) !== null) {

                result[1] = result[1].replace(/'|"/gi, '').trim();

                //Check if path is full or just relative
                if (result[1].indexOf(':') >= 0) {
                    importedFilePath = path.normalize(result[1]);
                } else {
                    importedFilePath = path.join(basedir, result[1]);
                }

                //Test if file without adding extension exists
                if (fs.existsSync(importedFilePath) && utils.isFileInsideFolder(projectPath, importedFilePath)) {

                    importedFiles.push(importedFilePath);

                } else {

                    if (path.extname(importedFilePath).toLowerCase() !== ext && _.contains(autoExt, ext)) {
                        importedFilePath = importedFilePath + ext;
                    }

                    if (fs.existsSync(importedFilePath) && utils.isFileInsideFolder(projectPath, importedFilePath)) {

                        importedFiles.push(importedFilePath);
                    }

                }
            }

        } else {

            //Read imports
            while ((result = importReg.exec(data)) !== null) {

                var res = result[1].replace(/"|'/gi, '').split(',');

                _.each(res, function (imp) {

                    imp = imp.trim();

                    if (imp && imp.indexOf(":") >= 0) {
                        importedFilePath = path.normalize(imp);
                    } else {
                        importedFilePath = path.join(basedir, imp);
                    }

                    //Add extension if file doesn't have that
                    if (path.extname(importedFilePath).toLowerCase() !== ext) {
                        importedFilePath = importedFilePath + ext;
                    }

                    //First check for partial file
                    var importedWithPartial = path.normalize(path.dirname(importedFilePath) + path.sep + '_' + path.basename(importedFilePath));

                    if (fs.existsSync(importedWithPartial) && utils.isFileInsideFolder(projectPath, importedWithPartial)) {

                        importedFiles.push(importedWithPartial);

                    } else if (fs.existsSync(importedFilePath) && utils.isFileInsideFolder(projectPath, importedFilePath)) {

                        importedFiles.push(importedFilePath);

                    }
                });
            }
        }

        return importedFiles;
    }


    //Function to visit imports with nested support
    function getImports(filePath, projectPath) {

        var fileImports = [];

        fileImports[0] = visitImports(filePath, projectPath);

        //Get imports of imports up to four levels
        for (var i = 1; i < 5; i++) {

            fileImports[i] = [];

            _.each(fileImports[i - 1], function (importedFile) {

                fileImports[i] = _.uniq(_.union(fileImports[i], visitImports(importedFile, projectPath)));

            });
        }

        //Remove repeated imports
        return _.uniq(_.flatten(fileImports));

    }


    return {
        getImports: getImports
    };

});
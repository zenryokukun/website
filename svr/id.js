import * as fs from "fs/promises";
import { fileURLToPath } from 'url';
import path from 'path';

/**
 * positionId.json:{"orderId":string,"password":string}
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetDir = "file"
const outputPath = path.join(__dirname,targetDir);
const ext = ".json";

export const idHandler = {

    create:function(positionId,orderId,password){
        const fpath = path.join(outputPath,positionId + ext)
        const data = {"orderId":orderId,"password":password};
        const dataJson = JSON.stringify(data);
        return fs.writeFile(fpath,dataJson,{"flag":"w"});
    },

    _find:async function(filename){
        /**
         * outputPathにfilenameがあればフルパスを返す。なければundefined
         * filename[String]:ファイル名　拡張子なし*/
        const files = await fs.readdir(outputPath);
        for (const file of files) {
            const fobj = path.parse(file);
            if (fobj.ext === ext && fobj.name === filename){
                return path.join(outputPath,fobj.base);
            }
        }  
    },
    
    delete:async function(filename){
        /**ouputPathにfilenameがあれば消す
         * filename[String]:filename without extension
         */
        const deleteFilePath = await this._find(filename);
        if (!deleteFilePath) {
            console.trace(`filename:${filename} does not exist`);
            return ;
        }
        fs.unlink(deleteFilePath);
    },

    searchId:async function(filename){
        /**ouputPathにfilenameがあれば中身を返す
         * filename[String]:filename without extension
         */
        const fileToRead = await this._find(filename);
        if (!fileToRead){
            console.trace(`filename:${filename} does not exist.`);
            return ;
        }
        const content = await fs.readFile(fileToRead,{encoding:"utf-8",flag:"r"});
        const data = JSON.parse(content);
        return data; 
    }
};

//idHandler.create("333","777","pwd");
idHandler.searchId("333").then(val => console.log(val));
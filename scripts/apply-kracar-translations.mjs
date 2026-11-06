import fs from "node:fs";
const rows=fs.readFileSync("kracar/translations.tsv","utf8").split(/\r?\n/).filter(Boolean).map(line=>line.split("|"));
for(const [locale,column] of [["fr",1],["ar",2]]){
  const file=`src/i18n/messages/${locale}.json`,dictionary=JSON.parse(fs.readFileSync(file,"utf8"));
  for(const row of rows){if(row.length!==3||row.some(v=>!v.trim()))throw new Error(`Invalid translation row: ${row[0]}`);dictionary[row[0]]=row[column];}
  fs.writeFileSync(file,JSON.stringify(dictionary,null,2)+"\n");
}
console.log(`Applied ${rows.length} KraCar translation rows in French and Arabic.`);

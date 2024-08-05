import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import wikilinks from 'markdown-it-wikilinks';
import markdownitattribution from 'markdown-it-attribution';
import markdownitfootnote from 'markdown-it-footnote';
import markdownItAttrs from 'markdown-it-attrs';
import markdownithighlightjs from 'markdown-it-highlightjs';

//Function to replace variables in a string
function replaceVariables(str, obj) {
  return str.replace(/{{(.*?)}}/g, (match, p1) => {
    const key = p1.trim();
    return key in obj ? obj[key] : match;
  });
}

//Function to parse YAML front matter and compile to HTML if publish is true
const processMarkdownFile = async (sourceFile, outputFile) => {
  const template = fs.readFileSync('./scripts/template.html', 'utf-8');
  // Initialize Markdown-it and its plugins
  const md = new MarkdownIt()
    .use(wikilinks({ uriSuffix: '.html' }))
    .use(markdownitattribution, { marker: '--' })
    .use(markdownitfootnote, {})
    .use(markdownithighlightjs, {})
    .use(markdownItAttrs, {});
  const extname = path.extname(sourceFile);
  if (extname === '.md' || extname === '.markdown') {
    const content = fs.readFileSync(sourceFile, 'utf-8');
    const { data, content: mdContent } = matter(content);
    const fileStats = fs.statSync(sourceFile);
    const lastChanged = new Date(fileStats.mtime).toISOString();
    const htmlContent = md.render(mdContent);

    data.title = data.title ? data.title : data.id ? data.id : path.basename(sourceFile);

    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };

    data["last-changed"] = new Date(data["last-changed"]).toLocaleDateString('en-us', options);
    data.created = new Date(data.created).toLocaleDateString('en-us', options);
    data["date"] = new Date(data["date"]).toLocaleDateString('en-us', options);

    const compiledContent = template.replace('{{content}}', htmlContent);
    const compiledHtml = replaceVariables(compiledContent, data);

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, compiledHtml);
    data['last-published'] = new Date().toISOString();
    data['last-changed'] = lastChanged;
    const updatedContent = matter.stringify(mdContent, data);
    fs.writeFileSync(sourceFile, updatedContent);
  } else {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.copyFileSync(sourceFile, outputFile);
  }
};

const main = async () => {
  const [sourceFile, outputFile] = process.argv.slice(2);
  if (!sourceFile || !outputFile) {
    console.error('Please provide both an input file and an output file path.');
    process.exit(1);
  }
  await processMarkdownFile(sourceFile, outputFile);
};

main();
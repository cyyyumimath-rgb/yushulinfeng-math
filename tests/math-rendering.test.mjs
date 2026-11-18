import test from "node:test";
import assert from "node:assert/strict";
import {mkdir,readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import katex from "katex";
import {build} from "esbuild";
import ts from "typescript";
import {splitMath} from "../lib/math-segments.ts";
import {questions,courses,resources,topics} from "../lib/content.ts";

const root=fileURLToPath(new URL("../",import.meta.url));
const scratch=path.join(root,".local");
await mkdir(scratch,{recursive:true});
const bundle=path.join(scratch,"math-rendering-test.mjs");
await build({entryPoints:[path.join(root,"components/math-text.tsx")],outfile:bundle,bundle:true,platform:"node",format:"esm",jsx:"automatic",packages:"external",logLevel:"silent"});
const {default:MathText,Formula}=await import(pathToFileURL(bundle).href+"?run="+Date.now());
const renderText=text=>renderToStaticMarkup(React.createElement(MathText,{text}));
const renderFormula=(tex,display=false)=>renderToStaticMarkup(React.createElement(Formula,{tex,display}));
const controls=/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
const strictOptions={throwOnError:true,trust:false,maxExpand:1000,maxSize:20,strict:"error",output:"htmlAndMathml"};

test("inline and display delimiters preserve prose and produce accessible KaTeX MathML",()=>{
  const input=String.raw`中文 $x^2$，分式 $$\frac{1}{2}$$；根式 \(\sqrt{x}\)，求和 \[\sum_{k=1}^{n} k\]。`;
  const segments=splitMath(input);
  assert.deepEqual(segments.filter(x=>x.kind==="math").map(x=>x.display),[false,true,false,true]);
  const html=renderText(input);
  assert.match(html,/中文/);
  assert.equal((html.match(/<math\b/g)||[]).length,4);
  assert.equal((html.match(/class="math-formula math-display"/g)||[]).length,2);
  assert.match(html,/<annotation encoding="application\/x-tex">/);
  assert.doesNotMatch(html,/math-fallback/);
});

test("ordinary text and invalid formula fallbacks are escaped as React text",()=>{
  const unsafe='<img src=x onerror="alert(1)"><script>alert(2)</script>';
  const textHtml=renderText(unsafe+' 与 $x$');
  assert.match(textHtml,/&lt;img/);
  assert.doesNotMatch(textHtml,/<(?:img|script)\b/i);
  const fallback=renderFormula(String.raw`\unknowncommand{<img src=x onerror=alert(1)>}`);
  assert.match(fallback,/math-fallback/);
  assert.match(fallback,/&lt;img/);
  assert.doesNotMatch(fallback,/<img\b/i);
});

test("untrusted LaTeX cannot introduce links, arbitrary classes or raw HTML",()=>{
  for(const tex of [String.raw`\href{javascript:alert(1)}{x}`,String.raw`\href{https://example.invalid}{x}`,String.raw`\htmlClass{attacker-class}{x}`,String.raw`\htmlStyle{color:red}{x}`]){
    const html=renderFormula(tex);
    assert.doesNotMatch(html,/<a\b|href\s*=|class="attacker-class"|style="color:red"/i,tex);
    assert.doesNotMatch(html,/<script\b|<img\b/i,tex);
  }
});

test("unclosed and escaped delimiters stay readable and do not throw",()=>{
  for(const text of ["未闭合 $x+1",String.raw`未闭合 \(x+1`,"未闭合 $$x+1",String.raw`未闭合 \[x+1`,String.raw`价格 \$5，普通文本`]){
    assert.deepEqual(splitMath(text),[{kind:"text",value:text}]);
    const html=renderText(text);
    assert.doesNotMatch(html,/<math\b|math-fallback/);
    assert.match(html,/未闭合|价格/);
  }
});

test("display formulas are phrasing-safe spans within existing paragraphs",()=>{
  const html=renderToStaticMarkup(React.createElement("p",null,React.createElement(MathText,{text:String.raw`结论：$$\frac{a}{b}=\sqrt{2}$$`})));
  assert.match(html,/^<p><span class="math-text/);
  assert.doesNotMatch(html,/<div\b/);
  assert.match(html,/math-display/);
});

function allStrings(value,at="content"){
  if(typeof value==="string")return [{at,text:value}];
  if(Array.isArray(value))return value.flatMap((x,i)=>allStrings(x,`${at}[${i}]`));
  if(value&&typeof value==="object")return Object.entries(value).flatMap(([key,x])=>allStrings(x,`${at}.${key}`));
  return [];
}

test("every delimited seed formula strictly parses and contains no escaped control characters",()=>{
  let count=0;
  for(const {at,text} of allStrings({topics,questions,courses,resources})){
    assert.ok(!controls.test(text),`${at} contains an unexpected control character`);
    for(const part of splitMath(text))if(part.kind==="math"){
      assert.doesNotThrow(()=>katex.renderToString(part.value,{...strictOptions,displayMode:part.display}),`${at}: ${part.value}`);
      count++;
    }
  }
  assert.ok(count>=60,`Expected populated LaTeX content, found only ${count} formulas`);
});

test("all String.raw formulas embedded in the site JSX strictly parse without escape corruption",async()=>{
  const filename=path.join(root,"app/learning-app.tsx");
  const sourceText=await readFile(filename,"utf8");
  const source=ts.createSourceFile(filename,sourceText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const formulas=[];
  function visit(node){
    if(ts.isTaggedTemplateExpression(node)&&node.tag.getText(source)==="String.raw"){
      assert.ok(ts.isNoSubstitutionTemplateLiteral(node.template),"Formula templates should have static, auditable LaTeX");
      const value=node.template.getText(source).slice(1,-1);
      const position=source.getLineAndCharacterOfPosition(node.getStart(source));
      const location=`learning-app.tsx:${position.line+1}`;
      assert.ok(!controls.test(value),`${location} contains a control character`);
      assert.ok(!value.includes("\\\\"),`${location} contains a doubled slash in a simple formula: ${value}`);
      assert.doesNotThrow(()=>katex.renderToString(value,strictOptions),`${location}: ${value}`);
      formulas.push(value);
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  assert.ok(formulas.length>=10,`Expected homepage/cover formulas, found ${formulas.length}`);
  assert.ok(formulas.includes(String.raw`V=\frac{1}{3}Sh`),"Course cover fraction must preserve the exact LaTeX command");
  assert.ok(formulas.includes(String.raw`\sin\theta`),"Trigonometry cover must preserve both LaTeX commands");
  assert.ok(formulas.includes(String.raw`f'(x)=3(x-1)(x+1)`),"Homepage derivative formula must remain intact");
});

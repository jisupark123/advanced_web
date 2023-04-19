// 고급 웹프로그래밍 과제 #1
// 박지수 60192753

const http = require('http');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs').promises;
const path = require('path');

//  URL 판별 정규식 (article/*)
const articleSpecificURLRegex = /^\/article\/\d+$/;

// 라우팅 핸들러를 감싸는 함수 (에러 핸들링)
async function withHandler(handler, res) {
  try {
    await handler();
  } catch (error) {
    res.writeHead(500);
    res.end(`Error loading index.html: ${error}`);
  }
}

// 쿠키 parse
const parseCookies = (cookie = '') =>
  cookie
    .split(';')
    .map((s) => s.split('='))
    .reduce((acc, [k, v]) => {
      acc[k.trim()] = decodeURIComponent(v);
      return acc;
    }, {});

/** 라우팅 핸들러
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse<http.IncomingMessage> & {req: http.IncomingMessage}} res
 */
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url);
  const urlPath = parsedUrl.pathname;

  // front.css
  if (urlPath === '/front.css') {
    const css = await fs.readFile(path.join(__dirname, 'front.css'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(css);
  }

  // front.js
  if (urlPath === '/front.js') {
    const js = await fs.readFile(path.join(__dirname, 'front.js'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/js' });
    res.end(js);
  }

  // get /
  if (urlPath === '/') {
    const html = await fs.readFile(path.join(__dirname, 'login.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html, 'utf-8');
  }

  // 로그인 시 쿠키 설정
  if (urlPath === '/login' && req.method === 'POST') {
    req.on('data', (data) => {
      const { id } = JSON.parse(data);
      res.setHeader('Set-Cookie', `userId=${encodeURIComponent(id)};`);
      res.end();
    });
  }

  // get /article
  // 쿠키가 없다면 홈으로 보내기
  if (urlPath === '/article' && req.method === 'GET') {
    const { userId } = parseCookies(req.headers.cookie);
    if (userId) {
      const html = await fs.readFile(path.join(__dirname, 'article.html'), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html, 'utf-8');
    } else {
      res.writeHead(302, { Location: '/' });
      res.end();
    }
  }

  // post /article
  // article.json 파일 받아와서 새로운 기사 추가하고 클라이언트에 전송 & json 업데이트
  if (urlPath === '/article' && req.method === 'POST') {
    req.on('data', async (data) => {
      const { text } = JSON.parse(data);
      const articleJson = JSON.parse(await fs.readFile(path.join(__dirname, 'article.json'), 'utf-8'));
      articleJson.articles.push({
        id: articleJson.articles.length + 1,
        text,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(articleJson.articles));
      fs.writeFile(path.join(__dirname, 'article.json'), JSON.stringify(articleJson), 'utf-8');
    });
  }

  // get /articles
  // article.json 파일 받아와서 클라이언트에 전송
  if (urlPath === '/articles') {
    const articles = await fs.readFile(path.join(__dirname, 'article.json'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(articles);
  }

  // get /article/*
  // article.json 의 해당 아이디의 article 반환 (없다면 빈 리스트)
  if (articleSpecificURLRegex.test(urlPath) && req.method === 'GET') {
    const articleId = urlPath.split('/').pop();
    const { articles } = JSON.parse(await fs.readFile(path.join(__dirname, 'article.json'), 'utf-8'));
    const article = articles.find((item) => item.id === +articleId);
    const response = article ?? [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  // put /article/*
  // article.json 의 해당 아이디의 기사 업데이트 -> 업데이트 된 리스트 반환 & 저장
  if (articleSpecificURLRegex.test(urlPath) && req.method === 'PUT') {
    req.on('data', async (data) => {
      const { text } = JSON.parse(data);
      const articleJson = JSON.parse(await fs.readFile(path.join(__dirname, 'article.json'), 'utf-8'));
      const articleId = articleJson.articles.findIndex((article) => article.id === +urlPath.split('/').pop());
      if (articleId === -1) {
        res.writeHead(400);
        res.end('해당 아이디의 기사를 찾을 수 없습니다.');
      } else {
        articleJson.articles[articleId].text = text;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(articleJson.articles));
        fs.writeFile(path.join(__dirname, 'article.json'), JSON.stringify(articleJson), 'utf-8');
      }
    });
  }

  // delete /article/*
  // article.json 의 해당 아이디의 article 삭제 -> 업데이트 된 리스트 반환 & 저장
  if (articleSpecificURLRegex.test(urlPath) && req.method === 'DELETE') {
    const articleId = +urlPath.split('/').pop();
    const articleJson = JSON.parse(await fs.readFile(path.join(__dirname, 'article.json'), 'utf-8'));
    const articleIndex = articleJson.articles.findIndex((article) => article.id === articleId);
    if (articleIndex === -1) {
      res.writeHead(400);
      res.end('해당 아이디의 기사를 찾을 수 없습니다.');
    } else {
      articleJson.articles.splice(articleIndex, 1);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(articleJson.articles));
      fs.writeFile(path.join(__dirname, 'article.json'), JSON.stringify(articleJson), 'utf-8');
    }
  }
}

const server = http.createServer((req, res) => withHandler(() => handleRequest(req, res), res));

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

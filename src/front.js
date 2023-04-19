// 고급 웹프로그래밍 과제 #1
// 박지수 60192753

// HTML Elements

const welcome = document.querySelector('#welcome');
const articleUL = document.querySelector('#article--list');

const articleTextarea = document.querySelector('#article--textarea');
const articleInput = document.querySelector('#article--input');

const uploadBtn = document.querySelector('#article--upload-btn');
const findBtn = document.querySelector('#find-btn');
const editBtn = document.querySelector('#edit-btn');
const deleteBtn = document.querySelector('#delete-btn');
const showAllBtn = document.querySelector('#article--show-all-btn');

// 프론트 코드에서 전역적으로 관리할 Article 리스트
class Article {
  articleList = [];

  constructor(article = []) {
    if (Array.isArray(article)) {
      this.articleList = article;
    } else {
      this.articleList = [article];
    }
    this.render();
  }

  // articleList를 화면에 렌더링
  render(articles = this.articleList) {
    if (!Array.isArray(articles)) {
      articles = [articles];
    }
    articleUL.innerHTML = '';
    for (let i = articles.length - 1; i >= 0; i--) {
      const li = document.createElement('li');
      li.textContent = articles[i].text.length > 15 ? `${articles[i].text.slice(0, 15)}...` : articles[i].text;
      articleUL.appendChild(li);
    }
  }

  // articleList setter
  setArticles(articles) {
    this.articleList = articles;
    this.render();
  }
}

// 쿠키 parser
const parseCookies = (cookie = '') =>
  cookie
    .split(';')
    .map((s) => s.split('='))
    .reduce((acc, [k, v]) => {
      acc[k.trim()] = decodeURIComponent(v);
      return acc;
    }, {});

// 서버와 통신하는 코드를 감싸는 함수 (에러 핸들링)
async function withHandler(event, handler) {
  try {
    await handler(event);
  } catch {
    alert('서버와의 통신이 원활하지 않습니다.');
  }
}

// 등록 버튼 클릭 시 실행
// 1. 기사 입력 여부 체크
// 2. 서버에 업로드 후 새로운 기사가 포함된 리스트 받아오기
// 3. 화면에 렌더링
async function uploadBtnClicked(event) {
  event.preventDefault();
  const articleText = articleTextarea.value.trim();
  if (!articleText.length) {
    alert('기사를 입력하세요.');
    return;
  }
  const newArticles = await uploadArticle(articleText);
  alert('성공적으로 업로드되었습니다.');
  articleClass.setArticles(newArticles);
  articleTextarea.value = '';
}

// 검색 버튼 클릭 시 실행
// 1. 기사 아이디 입력 체크
// 2. 서버에서 해당 아이디의 기사 받아오기
// 3. 화면에 렌더링
async function findBtnClicked(event) {
  event.preventDefault();
  const articleId = articleInput.value.trim();
  if (!articleId) {
    alert('아이디를 입력해주세요!');
    return;
  }
  const response = await fetch(`/article/${articleId}`);
  const article = await response.json();
  articleClass.render(article);
}

// 수정 버튼 클릭 시 실행
// 1. 기사 아이디, 기사 텍스트 입력 체크
// 2. 서버에 PUT 요청 -> 새로운 기사 목록 받아오기
// 3. 화면에 렌더링
async function editBtnClicked(event) {
  event.preventDefault();
  const articleText = articleTextarea.value.trim();
  const articleId = articleInput.value.trim();
  if (!articleId) {
    alert('아이디를 입력해주세요!');
    return;
  }
  if (!articleText.length) {
    alert('기사를 입력하세요.');
    return;
  }

  try {
    const articles = await fetch(`/article/${articleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: articleText,
      }),
    }).then((res) => res.json());
    alert('성공적으로 수정되었습니다.');
    articleClass.setArticles(articles);
    articleInput.value = '';
    articleTextarea.value = '';
  } catch {
    alert('해당 아이디의 기사를 찾을 수 없습니다.');
  }
}

// 삭제 버튼 클릭 시 실행
// 1. 기사 아읻디 입력 체크
// 2. 서버에 DELETE 요청 보내기 -> 새로운 기사 목록 받아오기
// 3. 화면에 렌더링
async function deleteBtnClicked(event) {
  event.preventDefault();
  const articleId = articleInput.value.trim();
  if (!articleId) {
    alert('아이디를 입력해주세요!');
    return;
  }
  try {
    const articles = await fetch(`/article/${articleId}`, {
      method: 'DELETE',
    }).then((res) => res.json());
    alert('성공적으로 삭제되었습니다.');
    articleClass.setArticles(articles);
    articleInput.value = '';
  } catch {
    alert('해당 아이디의 기사를 찾을 수 없습니다.');
  }
}

// 서버에서 article 목록을 받아오는 함수
async function getArticles() {
  const { articles } = await fetch('/articles').then((res) => res.json());
  return articles;
}

// 서버에 새로운 article 업로드 후 새로운 article 목록을 받아오는 함수
async function uploadArticle(text) {
  const response = await fetch('/article', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
    }),
  });
  const newArticle = await response.json();
  return newArticle;
}

////////////////// 전역 변수 ///////////////////////

const articleClass = new Article();

////////////////// Event Listener /////////////////////////

// 페이지 로드 시 쿠키에서 아이디 가져오고 article 목록 받아와서 화면에 렌더링
document.addEventListener('DOMContentLoaded', async () => {
  // const userId = document.cookie.userId;
  const { userId } = parseCookies(document.cookie);
  welcome.textContent = `${userId}님 환영합니다.`;
  const articles = await getArticles();
  articleClass.setArticles(articles);
});

// 각 버튼 클릭 이벤트 리스너
uploadBtn.addEventListener('click', (event) => withHandler(event, uploadBtnClicked));
findBtn.addEventListener('click', (event) => withHandler(event, findBtnClicked));
editBtn.addEventListener('click', (event) => withHandler(event, editBtnClicked));
deleteBtn.addEventListener('click', (event) => withHandler(event, deleteBtnClicked));
showAllBtn.addEventListener('click', () => articleClass.render());

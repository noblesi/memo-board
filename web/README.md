# SimpleBoard (memo-api)

Spring Boot + Vite/React로 만든 간단 게시판 연습 프로젝트입니다.

## Prerequisites
- Java 17
- Node.js (권장: 22.12+)
- Docker Desktop (PostgreSQL 사용 시)

## Run

### 1) PostgreSQL (Docker)
> 윈도우 포트 예약 문제로 5432 대신 15432 사용

```powershell
docker rm -f memo-postgres 2>$null

docker run --name memo-postgres `
  -e POSTGRES_DB=app `
  -e POSTGRES_USER=app `
  -e POSTGRES_PASSWORD=app `
  -p 15432:5432 `
  -d postgres:16
```

### 2) Backend (Spring Boot)
> src/main/resources/application-local.yml에 로컬 DB 설정을 둡니다.

```yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:15432/app
    username: app
    password: app
```

레포루트에서:
```powershell
cd memo-api
$env:SPRING_PROFILES_ACTIVE="local"
.\mvnw.cmd spring-boot:run
```

API: http://localhost:8080

### 3) Frontend (Vite/React)

```powershell
cd web
npm i
npm run dev
```

Web: http://127.0.0.1:34567

## Config (Frontend -> Backend)
> 프론트에서 백엔드 주소를 바꾸려면 web/.env.local에 아래를 추가하세요.

```
VITE_API_BASE=http://localhost:8080
```

## Features
- 게시글 CRUD
- 목록 페이지네이션 + 검색(q)
- 공통 에러 포맷 + validation fieldErrors 표시
- URL 동기화: /?q=...&page=...
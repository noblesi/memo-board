# SimpleBoard (memo-api)

Spring Boot + Vite/React로 만든 간단 게시판 연습 프로젝트입니다.

## Prerequisites
- Java 17
- Node.js (권장: 22.12+)
- Docker Desktop (PostgreSQL 사용 시)

## Run

### 1) PostgreSQL (Docker)
> 윈도우 포트 예약 문제로 5432 대신 15432 사용  
> 아래 중 **하나만** 선택해서 사용하세요.

#### 옵션 A) 매번 재생성(가장 단순/안전)
> 설정이 바뀌어도 항상 같은 상태로 재구성됩니다. (컨테이너 삭제/재생성)

```powershell
# 기존 컨테이너가 있으면 제거(없으면 무시)
docker rm -f memo-postgres 2>$null

# (선택) 데이터 유지용 볼륨
docker volume create memo-postgres-data 2>$null

docker run --name memo-postgres `
  -e POSTGRES_DB=app `
  -e POSTGRES_USER=app `
  -e POSTGRES_PASSWORD=app `
  -p 15432:5432 `
  -v memo-postgres-data:/var/lib/postgresql/data `
  -d postgres:16
```

#### 옵션 B) 한 번 만들고 이후엔 start로 재사용
> 컨테이너가 이미 있으면 **재시작만** 합니다.

```powershell
# 컨테이너가 없으면 생성
docker ps -a --format "{{.Names}}" | Select-String -SimpleMatch "memo-postgres" `
  | Out-Null; if ($LASTEXITCODE -ne 0) {
    docker volume create memo-postgres-data 2>$null

    docker run --name memo-postgres `
      -e POSTGRES_DB=app `
      -e POSTGRES_USER=app `
      -e POSTGRES_PASSWORD=app `
      -p 15432:5432 `
      -v memo-postgres-data:/var/lib/postgresql/data `
      -d postgres:16
  }

# 있으면(또는 방금 만들었으면) 시작
docker start memo-postgres | Out-Null
```

#### 자주 쓰는 명령어(정지/삭제)
```powershell
# 정지
docker stop memo-postgres

# 컨테이너 삭제(데이터는 볼륨에 남음)
docker rm -f memo-postgres

# 데이터(볼륨)까지 삭제
docker volume rm memo-postgres-data
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

API: http://localhost:18080

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
VITE_API_BASE=http://localhost:18080
```

## Features
- 게시글 CRUD
- 목록 페이지네이션 + 검색(q)
- 공통 에러 포맷 + validation fieldErrors 표시
- URL 동기화: /?q=...&page=...

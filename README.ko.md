# JOONS MCP Schema Toolkit

이 도구는 스냅샷 하나의 도구 스키마를 오프라인에서 검사합니다. Node.js 20 이상이 필요하며 외부 패키지는 필요하지 않습니다. 실제 서버에 연결하지 않으며 전체 JSON Schema 표준의 준수 여부를 보증하지 않습니다. 지원하지 않는 키워드는 불완전한 결과를 만듭니다. 불리언 스키마는 거부하며 참조 해석과 패턴 실행은 제공하지 않습니다.

validate는 입력과 출력 스키마의 지원 키워드를 검사합니다. lint는 지나치게 허용적인 형태를 찾는 휴리스틱입니다. check는 이름이 정확히 일치하는 도구의 입력 스키마에 객체 하나를 대조합니다. example은 결정적인 후보 하나를 생성하고 다시 검사합니다. 만족 가능한 스키마라도 예제를 만들지 못할 수 있습니다. subset은 지원 범위를 보여 줍니다.

보고서의 도구 번호는 정렬된 이름의 순서입니다. 속성 번호가 들어간 위치는 익명화된 구조 표시이며 원본 JSON에서 바로 찾을 수 있는 포인터가 아닙니다. 이름과 값은 보고서에 표시되지 않습니다. 예제와 fixture에는 선택한 도구 이름과 필수 속성 이름이 그대로 들어가므로 공유 전에 검토합니다. fixture는 출발점이며 전체 시험 모음이 아닙니다.

종료 코드 0은 성공이고 2는 입력이나 분석의 거부입니다. 명령 사용 오류는 3이고 출력 실패는 4입니다. strict는 이 버전에서 이미 실패 처리되는 거부의 기준을 바꾸지 않습니다. 출력 파일 여러 개는 하나의 트랜잭션이 아니므로 실패할 때 먼저 완성된 파일이 남을 수 있습니다. 파일 시스템의 동시 변경과 운영체제별 이름 변경 동작에는 잔여 위험이 있습니다. 민감 정보 탐지는 완전한 익명화를 보장하지 않습니다.

Probe는 실행 중인 서버를 확인하고 Diff는 스냅샷 간 변화를 분류합니다. Policy Gate는 거친 형태 규칙을 적용하고 Mock Server는 실행 시 인자를 검사합니다. 질문과 지원 범위가 다르므로 결과가 일치하지 않을 수 있습니다.

## 사용 방법

저장소 루트에서 다음 명령을 실행합니다. 출력 폴더는 입력 파일이 있는 폴더와 분리합니다.

```sh
node bin/joons-mcp-schema-toolkit.js validate --snapshot examples/snapshot.json --format json
node bin/joons-mcp-schema-toolkit.js lint --snapshot examples/snapshot.json
node bin/joons-mcp-schema-toolkit.js check --snapshot examples/snapshot.json --tool greet --arguments examples/arguments.json
node bin/joons-mcp-schema-toolkit.js example --snapshot examples/snapshot.json --tool greet --out example-output
node bin/joons-mcp-schema-toolkit.js subset --format json
node scripts/test.js
```


## 입력과 출력의 범위

입력 파일은 정해진 크기와 깊이 제한을 따릅니다. 중복된 객체 키나 예약된 위험 키가 있는 입력은 거부됩니다. 잘못된 입력은 성공으로 잘라서 처리하지 않습니다. 스키마에서 지원하지 않는 제약을 무시하고 유효하다고 판단하지 않습니다. 타입, 필수 속성, 배열과 문자열의 길이 및 숫자 경계 등 지원하는 항목은 subset 명령으로 확인할 수 있습니다.

예제 생성은 하나의 후보만 만듭니다. 스키마에 적힌 설명이나 값을 결과물에 복사하지 않습니다. 열거형이나 상수 및 경계 조건 때문에 유효한 예제가 존재해도 후보가 자체 검사를 통과하지 못할 수 있습니다. 그 경우에는 생성 불가를 보고합니다. 파일을 공유하기 전에 도구 이름과 필수 속성 이름에 민감한 정보가 없는지 확인합니다.

기존 출력 폴더에 다른 파일이 있을 때는 표시 파일 또는 명시적인 force 옵션이 필요합니다. 이 옵션도 경로 안전 검사를 생략하지 않고 관계없는 파일을 삭제하지 않습니다. 각 파일은 안전한 방식으로 기록하지만 여러 파일을 묶은 원자적 작업은 아닙니다. 검증과 쓰기 사이에 다른 프로세스가 파일 시스템을 바꾸는 위험은 완전히 사라지지 않습니다.

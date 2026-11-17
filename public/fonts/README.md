# 글꼴

| 파일 | 글꼴 | 출처 | 라이선스 |
|---|---|---|---|
| jeju-hallasan-subset.woff2 | 제주한라산체 (Jeju Hallasan, © 2010 Sandoll Communications) | 제주특별자치도 무료 배포 글꼴. npm `@noonnu/jeju-hallasan@0.1.0`(구글 폰트 Early Access 원본 파일)에서 받음 | 무료 사용 가능 (구글 폰트에서 SIL OFL 1.1로 제공되던 글꼴) |

서비스 이름("바당 PASS") 글씨에만 쓴다. 용량을 줄이려고 `바당` 두 글자와 영문·숫자·기호(U+0020–007E)만 남겼다 (670KB → 19KB).
다른 한글을 이 글꼴로 쓰려면 다시 만들어야 한다:

```bash
pip install fonttools brotli
pyftsubset jeju-hallasan-400.ttf --text="바당 PASS" --unicodes="U+0020-007E" --flavor=woff2 --layout-features='*' --output-file=jeju-hallasan-subset.woff2
```

구글 폰트 주소(fonts.googleapis.com/earlyaccess/jejuhallasan.css)는 CSS만 남아 있고 글꼴 파일은 404라 쓰지 않는다 (2026-11-17 확인).

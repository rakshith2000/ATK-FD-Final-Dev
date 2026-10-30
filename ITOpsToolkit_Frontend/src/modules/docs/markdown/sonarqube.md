# Install scanner

```bash
npm install -g @sonar/scan
```

Go to `sonar-project.properties` and update the `sonar.host.url` and `sonar.token` obtained from DevOps Team.

## Before Runing the scanner run below NPM commands

npm run test:coverage && npm run lint:report

# Run Scanner

```bash
sonar
```

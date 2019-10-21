const express = require('express')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT, 10) || 3000
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = express()

  let isAppGoingToBeClosed = false // SIGINT 시그널을 받았는지 여부. 앱이 곧 종료될 것임을 의미한다.

  server.use(function(req, res, next) {
    // 프로세스 종료 예정이라면 리퀘스트를 처리하지 않는다
    if (isAppGoingToBeClosed) {
      res.set('Connection', 'close')
    }

    next()
  })

  server.get('/a', (req, res) => {
    return app.render(req, res, '/a', req.query)
  })

  server.get('/b', (req, res) => {
    return app.render(req, res, '/b', req.query)
  })

  server.get('/posts/:id', (req, res) => {
    return app.render(req, res, '/posts', { id: req.params.id })
  })

  server.all('*', (req, res) => {
    return handle(req, res)
  })

  const listeningServer = server.listen(port, err => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)

    // PM2에게 앱 구동이 완료되었음을 전달한다
    if (process.send) {
      process.send('ready')
      console.log('sent ready signal to PM2 at', new Date())
    }
  })

  process.on('SIGINT', function() {
    console.log('> received SIGNIT signal')
    isAppGoingToBeClosed = true // 앱이 종료될 것

    // pm2 재시작 신호가 들어오면 서버를 종료시킨다.
    listeningServer.close(function(err) {
      console.log('server closed')
      process.exit(err ? 1 : 0)
    })
  })
})

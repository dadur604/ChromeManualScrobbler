var LastfmApi = require('lastfmapi')

var lfm = new LastfmApi({
  'api_key' : '914fa24ecc586c15b6b979d170dde4ea',
	'secret' : '2288df1e306518f149ff33c785f15ca0'
})

window.addEventListener('click',function(e){
  if(e.target.href!==undefined){
    chrome.tabs.create({url:e.target.href})
  }
})

checkCredentials()

document.addEventListener("click", function(e) {
  if (!e.target.classList.contains("submit-button")) {
    return
  }

  if (e.target.id === "submit-auth"){
    var token = document.getElementById("seshtoken").value
    if (!token) {
      e.target.className += " invalid"
      return
    }

    e.target.classList.remove("invalid")

    lfm.authenticate(token, function (err, session) {
      if (err) { 
        e.target.className += " invalid"
        throw err
      }
      checkCredentials()
      console.log(session) // {"name": "LASTFM_USERNAME", "key": "THE_USER_SESSION_KEY"}
    });
  }

  if (e.target.id === "submit-scrobble"){
    var songname = document.getElementById("songname").value
    var artistname = document.getElementById("artistname").value

    if ( (!songname) || (!artistname) ){
      e.target.className += " invalid"
      return
    }
    e.target.classList.remove("invalid")
    handleSubmit(songname, artistname)
  }

  if (e.target.id === "submit-clear"){
	handleClear()
  }

  if (e.target.id === "submit-search"){
    var songname = document.getElementById("songname").value
    var artistname = document.getElementById("artistname").value

    if (!songname){
      e.target.className += " invalid"
      return
    }
    e.target.classList.remove("invalid")
    handleSearch(songname, artistname)
  }

});

function checkCredentials () {
  if (lfm.sessionCredentials) {
    showDiv("scrobble-div")
    chrome.storage.sync.set({session: { key: lfm.sessionCredentials.key, username: lfm.sessionCredentials.username}}, () => {
      console.log('Set session to: ', lfm.sessionCredentials)
    })
    return
  }

  chrome.storage.sync.get("session", (d) => {
		console.log("we got session data:", d)
		console.log("session: ", d.session)
    if (d.session) {
      lfm.setSessionCredentials(d.session.username, d.session.key)
      showDiv("scrobble-div")
    }
  })


  showDiv("auth-div")

  var authUrl = lfm.getAuthenticationUrl({ 'cb' : 'http://example.com/auth' })

  var authElem = document.createElement('a')
  authElem.href = authUrl 
  authElem.textContent = "Click Here to Authenticate"
  document.getElementById("auth-text").appendChild(authElem)
}

function handleSearch (songname, artistname) {
  var params = {
    'track' : songname
  }

  if (artistname) {
    params.artist = artistname
  }
  lfm.track.search(params, function (err, res) {
    if (err) { throw err; }
    console.log("search returned: ", res)

    var tracks = res.trackmatches.track
    var restable = document.getElementById("search-results-table")
    restable.innerHTML = ""

    var backRow = document.createElement('tr')
    var tdBack = document.createElement('td')

    tdBack.className += " table-border"
    tdBack.innerText = "<"
    tdBack.onclick = () => {
      showDiv('scrobble-div')
    }

    backRow.appendChild(tdBack)
    restable.appendChild(backRow)

    for(var i = 0; i < 6; i++){
      if (!tracks[i]) break
      var row = document.createElement('tr')

      var tdTitle = document.createElement('td')
      var tdArtist = document.createElement('td')
      var tdListeners = document.createElement('td')

      tdTitle.innerText = `${tracks[i].name}`
      tdArtist.innerText = `${tracks[i].artist}`
      tdListeners.innerText = `${tracks[i].listeners}`

      row.appendChild(tdTitle)
      row.appendChild(tdArtist)
      row.appendChild(tdListeners)

      for(var c of row.children){
        c.className += " table-border"
      }

      row.onclick = ((track) => {
        return function () {
          document.getElementById("songname").value = track.name
          document.getElementById("artistname").value = track.artist
          showDiv('scrobble-div')
        }
      })(tracks[i])
      row.className += " search-row table-border"
      restable.appendChild(row)
    }
    showDiv('search-results-div')
    
  });
}

function handleSubmit (songname, artistname) {
  showLoader()
  lfm.track.scrobble({
    'artist' : artistname,
    'track' : songname,
    'timestamp' : (new Date()).getTime() / 1000
  
  }, function (err, scrobbles) {
    if (err) {
      handleClear()
      document.querySelector('.circle-loader').style.borderColor = "red"
      loadCompleteNoCheck()
      setTimeout(() => { showDiv('scrobble-div') }, 1500)
      return console.log('We\'re in trouble', err);
    }
  handleClear()
  document.querySelector('.circle-loader').style.borderColor = ""
  loadComplete(true)
  setTimeout(() => { showDiv('scrobble-div') }, 1500)
    console.log('We have just scrobbled:', scrobbles); 
  });
}

function showDiv (divname){
  var auth = document.getElementById("auth-div")
  var scrob = document.getElementById("scrobble-div")
  var search = document.getElementById("search-results-div")
  
  document.querySelector('.circle-loader').style.display = "none"
  document.querySelector('.checkmark').style.display = "none"
  loadComplete(false)

  auth.hidden = true
  scrob.hidden = true
  search.hidden = true

  switch (divname){
    case "auth-div":
      auth.hidden = false
      break
    case "scrobble-div":
      scrob.hidden = false
      break
    case "search-results-div":
      search.hidden = false
      break
  }
}

function handleClear() {
  document.getElementById("songname").value = ""
  document.getElementById("artistname").value = ""
}

function showLoader() {
  showDiv()
  document.getElementsByClassName('circle-loader')[0].style.display = ""
}

function loadCompleteNoCheck(){
  document.querySelector('.circle-loader').classList.add('load-complete')
}

function loadComplete(comp) {
  if (comp) {
    document.querySelector('.circle-loader').classList.add('load-complete')
    document.querySelector('.checkmark').style.display = ""
  } else {
    document.querySelector('.circle-loader').classList.remove('load-complete')
    document.querySelector('.checkmark').style.display = "none"
  }
}
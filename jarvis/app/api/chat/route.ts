import { GoogleGenerativeAI } from "@google/generative-ai"

// 9 predefined API keys - will rotate through them
const API_KEYS = [
  "AIzaSyDWrNn2PFNEntv3FRM0Lbdmwd-tcT0ODK4",
  "AIzaSyDyOdZgsvEp1vZIXn1AR7PeRpor8LOOLg8",
  "AIzaSyCuSNk53R8-35D_s72xygqG5ZWqeFgEUpc",
  "AIzaSyBvTKlnZ3E3PclGhusOrLqNT7SFhPmaZVM",
  "AIzaSyA7ji2fRUzuFo_GXN8UpQJgl8iBmtwSaWw",
  "AIzaSyDFZXsUWmWmW1E0ncM2nxeHU-16i822gaY",
  "AIzaSyBLIciIHiuZ-ooZgzZvPPK0Gk1sOsL5vZ0",
  "AIzaSyA_bVMYW4SaTlBJ3KodbYR_6PtOVzYv-F4",
  "AIzaSyAx8vPkLsefSLqJFTmPvySENkNxV_Ig2yU",
]

let currentKeyIndex = 0

function getNextApiKey(): string {
  const key = API_KEYS[currentKeyIndex]
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length
  return key
}

interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
  favicon: string
}

interface SearchResponse {
  results: SearchResult[]
  searchContext: string
}

async function searchWeb(query: string): Promise<SearchResponse> {
  const results: SearchResult[] = []
  let searchContext = ""
  const encodedQuery = encodeURIComponent(query)
  const searchPromises: Promise<void>[] = []

  // Helper to safely fetch with timeout
  const safeFetch = async (url: string, options?: RequestInit): Promise<Response | null> => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeout)
      return response.ok ? response : null
    } catch {
      return null
    }
  }

  // Helper to add direct search links (no API needed)
  const addSearchLink = (name: string, url: string, snippet: string, favicon: string) => {
    results.push({ title: `${query} on ${name}`, url, snippet, source: name, favicon })
  }

  // ============= LIVE API SOURCES (fetch actual data) =============

  // 1. DuckDuckGo Instant Answer
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1`)
      if (response) {
        const data = await response.json()
        if (data.Abstract) {
          results.push({
            title: data.Heading || query,
            url: data.AbstractURL || `https://duckduckgo.com/?q=${encodedQuery}`,
            snippet: data.Abstract.substring(0, 250),
            source: "DuckDuckGo",
            favicon: "https://duckduckgo.com/favicon.ico",
          })
          searchContext += `[DuckDuckGo]: ${data.Abstract}\n\n`
        }
        // Related topics
        for (const topic of data.RelatedTopics?.slice(0, 3) || []) {
          if (topic.Text) {
            results.push({
              title: topic.Text.substring(0, 60),
              url: topic.FirstURL || "",
              snippet: topic.Text.substring(0, 200),
              source: "DuckDuckGo",
              favicon: "https://duckduckgo.com/favicon.ico",
            })
          }
        }
      }
    })(),
  )

  // 2. Stack Overflow
  searchPromises.push(
    (async () => {
      const response = await safeFetch(
        `https://api.stackexchange.com/2.3/search/excerpts?order=desc&sort=relevance&q=${encodedQuery}&site=stackoverflow&pagesize=3`,
      )
      if (response) {
        const data = await response.json()
        for (const item of data.items?.slice(0, 3) || []) {
          results.push({
            title: item.title?.replace(/<[^>]*>/g, ""),
            url: `https://stackoverflow.com/questions/${item.question_id}`,
            snippet: (item.excerpt || "").replace(/<[^>]*>/g, "").substring(0, 200),
            source: "Stack Overflow",
            favicon: "https://stackoverflow.com/favicon.ico",
          })
          searchContext += `[StackOverflow]: ${item.title}\n`
        }
      }
    })(),
  )

  // 3. GitHub Repositories
  searchPromises.push(
    (async () => {
      const response = await safeFetch(
        `https://api.github.com/search/repositories?q=${encodedQuery}&sort=stars&per_page=3`,
        { headers: { Accept: "application/vnd.github.v3+json" } },
      )
      if (response) {
        const data = await response.json()
        for (const repo of data.items?.slice(0, 3) || []) {
          results.push({
            title: repo.full_name,
            url: repo.html_url,
            snippet: repo.description?.substring(0, 200) || `Stars: ${repo.stargazers_count}`,
            source: "GitHub",
            favicon: "https://github.com/favicon.ico",
          })
        }
      }
    })(),
  )

  // 4. GitHub Topics (public, no auth needed)
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://api.github.com/search/topics?q=${encodedQuery}&per_page=2`, {
        headers: { Accept: "application/vnd.github.v3+json" },
      })
      if (response) {
        const data = await response.json()
        for (const topic of data.items?.slice(0, 2) || []) {
          results.push({
            title: topic.name,
            url: `https://github.com/topics/${topic.name}`,
            snippet: topic.short_description || topic.description?.substring(0, 200) || "GitHub Topic",
            source: "GitHub Topics",
            favicon: "https://github.com/favicon.ico",
          })
        }
      }
    })(),
  )

  // 5. Hacker News
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://hn.algolia.com/api/v1/search?query=${encodedQuery}&hitsPerPage=3`)
      if (response) {
        const data = await response.json()
        for (const hit of data.hits?.slice(0, 3) || []) {
          results.push({
            title: hit.title || hit.story_title || "HN Post",
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            snippet: `Points: ${hit.points || 0} | Comments: ${hit.num_comments || 0}`,
            source: "Hacker News",
            favicon: "https://news.ycombinator.com/favicon.ico",
          })
          if (hit.title) searchContext += `[HackerNews]: ${hit.title}\n`
        }
      }
    })(),
  )

  // 6. arXiv (Academic Papers)
  searchPromises.push(
    (async () => {
      const response = await safeFetch(
        `https://export.arxiv.org/api/query?search_query=all:${encodedQuery}&max_results=3`,
      )
      if (response) {
        const text = await response.text()
        const entries = text.match(/<entry>([\s\S]*?)<\/entry>/g) || []
        for (const entry of entries.slice(0, 3)) {
          const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim()
          const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim()
          const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim()
          if (title && id) {
            results.push({
              title: title.substring(0, 100),
              url: id,
              snippet: summary?.substring(0, 200) || "",
              source: "arXiv",
              favicon: "https://arxiv.org/favicon.ico",
            })
            searchContext += `[arXiv]: ${title}\n`
          }
        }
      }
    })(),
  )

  // 7. Open Library (Books)
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://openlibrary.org/search.json?q=${encodedQuery}&limit=3`)
      if (response) {
        const data = await response.json()
        for (const doc of data.docs?.slice(0, 3) || []) {
          results.push({
            title: doc.title,
            url: `https://openlibrary.org${doc.key}`,
            snippet: `By ${doc.author_name?.[0] || "Unknown"} (${doc.first_publish_year || "N/A"})`,
            source: "Open Library",
            favicon: "https://openlibrary.org/favicon.ico",
          })
        }
      }
    })(),
  )

  // 8. MDN Web Docs
  searchPromises.push(
    (async () => {
      const response = await safeFetch(
        `https://developer.mozilla.org/api/v1/search?q=${encodedQuery}&locale=en-US&size=3`,
      )
      if (response) {
        const data = await response.json()
        for (const doc of data.documents?.slice(0, 3) || []) {
          results.push({
            title: doc.title,
            url: `https://developer.mozilla.org${doc.mdn_url}`,
            snippet: doc.summary?.substring(0, 200) || "",
            source: "MDN",
            favicon: "https://developer.mozilla.org/favicon.ico",
          })
          searchContext += `[MDN]: ${doc.title} - ${doc.summary?.substring(0, 100)}\n`
        }
      }
    })(),
  )

  // 9. NPM Packages
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://registry.npmjs.org/-/v1/search?text=${encodedQuery}&size=3`)
      if (response) {
        const data = await response.json()
        for (const obj of data.objects?.slice(0, 3) || []) {
          results.push({
            title: obj.package.name,
            url: `https://www.npmjs.com/package/${obj.package.name}`,
            snippet: obj.package.description?.substring(0, 200) || "",
            source: "NPM",
            favicon: "https://www.npmjs.com/favicon.ico",
          })
        }
      }
    })(),
  )

  // 10. PyPI (Python Packages)
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://pypi.org/simple/`)
      if (response) {
        results.push({
          title: `${query} Python packages`,
          url: `https://pypi.org/search/?q=${encodedQuery}`,
          snippet: "Python packages on PyPI",
          source: "PyPI",
          favicon: "https://pypi.org/favicon.ico",
        })
      }
    })(),
  )

  // 11. OpenStreetMap (Location)
  searchPromises.push(
    (async () => {
      const response = await safeFetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=2`,
        { headers: { "User-Agent": "JARVIS/1.0" } },
      )
      if (response) {
        const data = await response.json()
        for (const place of data?.slice(0, 2) || []) {
          results.push({
            title: place.display_name?.split(",")[0],
            url: `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`,
            snippet: place.display_name?.substring(0, 200),
            source: "OpenStreetMap",
            favicon: "https://www.openstreetmap.org/favicon.ico",
          })
        }
      }
    })(),
  )

  // 12. Internet Archive
  searchPromises.push(
    (async () => {
      const response = await safeFetch(
        `https://archive.org/advancedsearch.php?q=${encodedQuery}&fl[]=title,identifier&rows=3&output=json`,
      )
      if (response) {
        const data = await response.json()
        for (const doc of data.response?.docs?.slice(0, 3) || []) {
          results.push({
            title: doc.title || "Archive",
            url: `https://archive.org/details/${doc.identifier}`,
            snippet: "Internet Archive item",
            source: "Internet Archive",
            favicon: "https://archive.org/favicon.ico",
          })
        }
      }
    })(),
  )

  // 13. CrossRef (Academic Papers)
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://api.crossref.org/works?query=${encodedQuery}&rows=3`)
      if (response) {
        const data = await response.json()
        for (const item of data.message?.items?.slice(0, 3) || []) {
          results.push({
            title: item.title?.[0]?.substring(0, 100),
            url: item.URL || "",
            snippet: `${item.publisher || ""} - ${item["container-title"]?.[0] || ""}`.substring(0, 200),
            source: "CrossRef",
            favicon: "https://www.crossref.org/favicon.ico",
          })
        }
      }
    })(),
  )

  // 14. iTunes/Apple (Apps/Music)
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://itunes.apple.com/search?term=${encodedQuery}&limit=3`)
      if (response) {
        const data = await response.json()
        for (const item of data.results?.slice(0, 3) || []) {
          results.push({
            title: item.trackName || item.collectionName,
            url: item.trackViewUrl || item.collectionViewUrl,
            snippet: item.artistName || "",
            source: "iTunes",
            favicon: "https://www.apple.com/favicon.ico",
          })
        }
      }
    })(),
  )

  // 15. Flickr
  searchPromises.push(
    (async () => {
      const response = await safeFetch(
        `https://api.flickr.com/services/feeds/photos_public.gne?format=json&nojsoncallback=1&tags=${encodedQuery}`,
      )
      if (response) {
        const data = await response.json()
        for (const item of data.items?.slice(0, 2) || []) {
          results.push({
            title: item.title || "Photo",
            url: item.link,
            snippet: `By ${item.author || "Unknown"}`,
            source: "Flickr",
            favicon: "https://www.flickr.com/favicon.ico",
          })
        }
      }
    })(),
  )

  // 16. Dev.to Articles
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://dev.to/api/articles?tag=${query.replace(/ /g, "")}&per_page=3`)
      if (response) {
        const data = await response.json()
        for (const article of data?.slice(0, 3) || []) {
          results.push({
            title: article.title,
            url: article.url,
            snippet: article.description?.substring(0, 200) || "",
            source: "Dev.to",
            favicon: "https://dev.to/favicon.ico",
          })
          searchContext += `[Dev.to]: ${article.title}\n`
        }
      }
    })(),
  )

  // 17. Hugging Face Models
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://huggingface.co/api/models?search=${encodedQuery}&limit=3`)
      if (response) {
        const data = await response.json()
        for (const model of data?.slice(0, 3) || []) {
          results.push({
            title: model.modelId,
            url: `https://huggingface.co/${model.modelId}`,
            snippet: model.pipeline_tag || "ML Model",
            source: "Hugging Face",
            favicon: "https://huggingface.co/favicon.ico",
          })
        }
      }
    })(),
  )

  // 18. PubMed (Medical Research)
  searchPromises.push(
    (async () => {
      const response = await safeFetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodedQuery}&retmax=3&retmode=json`,
      )
      if (response) {
        const data = await response.json()
        for (const id of data.esearchresult?.idlist?.slice(0, 3) || []) {
          results.push({
            title: `PubMed Article ${id}`,
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
            snippet: "Medical research article",
            source: "PubMed",
            favicon: "https://pubmed.ncbi.nlm.nih.gov/favicon.ico",
          })
        }
      }
    })(),
  )

  // 19. Free Dictionary
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query.split(" ")[0]}`)
      if (response) {
        const data = await response.json()
        if (Array.isArray(data) && data[0]) {
          const word = data[0]
          const meaning = word.meanings?.[0]?.definitions?.[0]?.definition
          if (meaning) {
            results.push({
              title: word.word,
              url: `https://www.dictionary.com/browse/${word.word}`,
              snippet: meaning.substring(0, 200),
              source: "Dictionary",
              favicon: "https://www.dictionary.com/favicon.ico",
            })
            searchContext += `[Dictionary]: ${word.word} - ${meaning}\n`
          }
        }
      }
    })(),
  )

  // 20. Urban Dictionary
  searchPromises.push(
    (async () => {
      const response = await safeFetch(`https://api.urbandictionary.com/v0/define?term=${encodedQuery}`)
      if (response) {
        const data = await response.json()
        if (data.list?.[0]) {
          results.push({
            title: data.list[0].word,
            url: data.list[0].permalink,
            snippet: data.list[0].definition?.replace(/\[|\]/g, "").substring(0, 200),
            source: "Urban Dictionary",
            favicon: "https://www.urbandictionary.com/favicon.ico",
          })
        }
      }
    })(),
  )

  // 21. Recipe Search (Edamam)
  searchPromises.push(
    (async () => {
      results.push({
        title: `${query} recipes`,
        url: `https://www.allrecipes.com/search?q=${encodedQuery}`,
        snippet: "Recipes and cooking",
        source: "AllRecipes",
        favicon: "https://www.allrecipes.com/favicon.ico",
      })
    })(),
  )

  // 22. Podcast Index
  searchPromises.push(
    (async () => {
      results.push({
        title: `${query} podcasts`,
        url: `https://podcastindex.org/search?q=${encodedQuery}`,
        snippet: "Podcast episodes",
        source: "Podcast Index",
        favicon: "https://podcastindex.org/favicon.ico",
      })
    })(),
  )

  // Central Government Portals
  addSearchLink(
    "India.gov.in",
    `https://www.india.gov.in/search/site/${encodedQuery}`,
    "National Portal of India",
    "https://www.india.gov.in/favicon.ico",
  )
  addSearchLink(
    "MyGov",
    `https://www.mygov.in/search/node/${encodedQuery}`,
    "Citizen Engagement Platform",
    "https://www.mygov.in/favicon.ico",
  )
  addSearchLink(
    "Digital India",
    `https://www.digitalindia.gov.in/?s=${encodedQuery}`,
    "Digital India Portal",
    "https://www.digitalindia.gov.in/favicon.ico",
  )
  addSearchLink(
    "PIB India",
    `https://pib.gov.in/indexd.aspx?search=${encodedQuery}`,
    "Press Information Bureau",
    "https://pib.gov.in/favicon.ico",
  )
  addSearchLink(
    "NIC India",
    `https://www.nic.in/search/?q=${encodedQuery}`,
    "National Informatics Centre",
    "https://www.nic.in/favicon.ico",
  )
  addSearchLink(
    "PMJDY",
    `https://pmjdy.gov.in/search?q=${encodedQuery}`,
    "Jan Dhan Yojana",
    "https://pmjdy.gov.in/favicon.ico",
  )
  addSearchLink(
    "UMANG",
    `https://web.umang.gov.in/web_new/search?q=${encodedQuery}`,
    "Unified Mobile App",
    "https://web.umang.gov.in/favicon.ico",
  )
  addSearchLink(
    "DigiLocker",
    `https://www.digilocker.gov.in/search?q=${encodedQuery}`,
    "Digital Documents",
    "https://www.digilocker.gov.in/favicon.ico",
  )
  addSearchLink(
    "e-Governance",
    `https://www.meity.gov.in/?s=${encodedQuery}`,
    "Ministry of Electronics & IT",
    "https://www.meity.gov.in/favicon.ico",
  )
  addSearchLink(
    "NITI Aayog",
    `https://www.niti.gov.in/search/node/${encodedQuery}`,
    "Policy Think Tank",
    "https://www.niti.gov.in/favicon.ico",
  )
  addSearchLink(
    "Make in India",
    `https://www.makeinindia.com/search?q=${encodedQuery}`,
    "Manufacturing Hub",
    "https://www.makeinindia.com/favicon.ico",
  )
  addSearchLink(
    "Startup India",
    `https://www.startupindia.gov.in/content/search?q=${encodedQuery}`,
    "Startup Ecosystem",
    "https://www.startupindia.gov.in/favicon.ico",
  )
  addSearchLink(
    "Skill India",
    `https://www.skillindia.gov.in/?s=${encodedQuery}`,
    "Skill Development",
    "https://www.skillindia.gov.in/favicon.ico",
  )
  addSearchLink(
    "Swachh Bharat",
    `https://swachhbharat.mygov.in/search/node/${encodedQuery}`,
    "Clean India Mission",
    "https://swachhbharat.mygov.in/favicon.ico",
  )
  addSearchLink(
    "Ayushman Bharat",
    `https://pmjay.gov.in/search?q=${encodedQuery}`,
    "Health Insurance Scheme",
    "https://pmjay.gov.in/favicon.ico",
  )
  addSearchLink(
    "PM Kisan",
    `https://pmkisan.gov.in/search?q=${encodedQuery}`,
    "Farmer Welfare",
    "https://pmkisan.gov.in/favicon.ico",
  )
  addSearchLink(
    "EPFO",
    `https://www.epfindia.gov.in/site_en/search.php?q=${encodedQuery}`,
    "Provident Fund",
    "https://www.epfindia.gov.in/favicon.ico",
  )
  addSearchLink(
    "Income Tax",
    `https://www.incometax.gov.in/iec/foportal/search?q=${encodedQuery}`,
    "Income Tax Portal",
    "https://www.incometax.gov.in/favicon.ico",
  )
  addSearchLink(
    "GST Portal",
    `https://www.gst.gov.in/search?q=${encodedQuery}`,
    "Goods & Services Tax",
    "https://www.gst.gov.in/favicon.ico",
  )
  addSearchLink(
    "RBI",
    `https://www.rbi.org.in/scripts/SearchResults.aspx?search=${encodedQuery}`,
    "Reserve Bank of India",
    "https://www.rbi.org.in/favicon.ico",
  )
  addSearchLink(
    "SEBI",
    `https://www.sebi.gov.in/search.html?q=${encodedQuery}`,
    "Securities Exchange Board",
    "https://www.sebi.gov.in/favicon.ico",
  )
  addSearchLink(
    "NSE India",
    `https://www.nseindia.com/search?q=${encodedQuery}`,
    "National Stock Exchange",
    "https://www.nseindia.com/favicon.ico",
  )
  addSearchLink(
    "BSE India",
    `https://www.bseindia.com/search.aspx?q=${encodedQuery}`,
    "Bombay Stock Exchange",
    "https://www.bseindia.com/favicon.ico",
  )
  addSearchLink(
    "UIDAI",
    `https://uidai.gov.in/search.html?q=${encodedQuery}`,
    "Aadhaar Authority",
    "https://uidai.gov.in/favicon.ico",
  )
  addSearchLink(
    "Passport Seva",
    `https://www.passportindia.gov.in/AppOnlineProject/search?q=${encodedQuery}`,
    "Passport Services",
    "https://www.passportindia.gov.in/favicon.ico",
  )
  addSearchLink(
    "IRCTC",
    `https://www.irctc.co.in/nget/train-search`,
    "Railway Booking",
    "https://www.irctc.co.in/favicon.ico",
  )
  addSearchLink(
    "Indian Railways",
    `https://www.indianrailways.gov.in/railwayboard/search?q=${encodedQuery}`,
    "Railways Ministry",
    "https://www.indianrailways.gov.in/favicon.ico",
  )
  addSearchLink(
    "Ministry of Defence",
    `https://www.mod.gov.in/?s=${encodedQuery}`,
    "Defence Ministry",
    "https://www.mod.gov.in/favicon.ico",
  )
  addSearchLink(
    "Ministry of Home",
    `https://www.mha.gov.in/search/node/${encodedQuery}`,
    "Home Affairs",
    "https://www.mha.gov.in/favicon.ico",
  )
  addSearchLink(
    "MEA India",
    `https://www.mea.gov.in/search.htm?q=${encodedQuery}`,
    "External Affairs",
    "https://www.mea.gov.in/favicon.ico",
  )
  addSearchLink(
    "Ministry of Finance",
    `https://www.finmin.nic.in/search/node/${encodedQuery}`,
    "Finance Ministry",
    "https://www.finmin.nic.in/favicon.ico",
  )
  addSearchLink(
    "Ministry of Education",
    `https://www.education.gov.in/search/node/${encodedQuery}`,
    "Education Ministry",
    "https://www.education.gov.in/favicon.ico",
  )
  addSearchLink(
    "UGC India",
    `https://www.ugc.ac.in/search.aspx?q=${encodedQuery}`,
    "University Grants Commission",
    "https://www.ugc.ac.in/favicon.ico",
  )
  addSearchLink(
    "AICTE",
    `https://www.aicte-india.org/search?q=${encodedQuery}`,
    "Technical Education Council",
    "https://www.aicte-india.org/favicon.ico",
  )
  addSearchLink(
    "CBSE",
    `https://www.cbse.gov.in/search?q=${encodedQuery}`,
    "Central Board of Education",
    "https://www.cbse.gov.in/favicon.ico",
  )
  addSearchLink(
    "Ministry of Health",
    `https://www.mohfw.gov.in/?q=${encodedQuery}`,
    "Health Ministry",
    "https://www.mohfw.gov.in/favicon.ico",
  )
  addSearchLink(
    "ICMR",
    `https://www.icmr.gov.in/search?q=${encodedQuery}`,
    "Medical Research Council",
    "https://www.icmr.gov.in/favicon.ico",
  )
  addSearchLink(
    "CoWIN",
    `https://www.cowin.gov.in/search?q=${encodedQuery}`,
    "COVID Vaccination",
    "https://www.cowin.gov.in/favicon.ico",
  )
  addSearchLink(
    "Ministry of Agriculture",
    `https://agricoop.nic.in/search/node/${encodedQuery}`,
    "Agriculture Ministry",
    "https://agricoop.nic.in/favicon.ico",
  )
  addSearchLink(
    "ICAR",
    `https://icar.org.in/search?q=${encodedQuery}`,
    "Agricultural Research",
    "https://icar.org.in/favicon.ico",
  )
  addSearchLink(
    "Ministry of Law",
    `https://lawmin.gov.in/search/node/${encodedQuery}`,
    "Law Ministry",
    "https://lawmin.gov.in/favicon.ico",
  )
  addSearchLink(
    "Supreme Court",
    `https://main.sci.gov.in/search?q=${encodedQuery}`,
    "Supreme Court of India",
    "https://main.sci.gov.in/favicon.ico",
  )
  addSearchLink(
    "e-Courts",
    `https://ecourts.gov.in/ecourts_home/search.php?q=${encodedQuery}`,
    "Court Services",
    "https://ecourts.gov.in/favicon.ico",
  )
  addSearchLink(
    "India Code",
    `https://www.indiacode.nic.in/search?q=${encodedQuery}`,
    "Legal Database",
    "https://www.indiacode.nic.in/favicon.ico",
  )
  addSearchLink(
    "Election Commission",
    `https://eci.gov.in/search?q=${encodedQuery}`,
    "ECI India",
    "https://eci.gov.in/favicon.ico",
  )
  addSearchLink(
    "Census India",
    `https://censusindia.gov.in/search?q=${encodedQuery}`,
    "Population Census",
    "https://censusindia.gov.in/favicon.ico",
  )
  addSearchLink(
    "ISRO",
    `https://www.isro.gov.in/search?q=${encodedQuery}`,
    "Space Research",
    "https://www.isro.gov.in/favicon.ico",
  )
  addSearchLink(
    "DRDO",
    `https://www.drdo.gov.in/search/node/${encodedQuery}`,
    "Defence Research",
    "https://www.drdo.gov.in/favicon.ico",
  )
  addSearchLink(
    "BARC",
    `https://www.barc.gov.in/search?q=${encodedQuery}`,
    "Atomic Research Centre",
    "https://www.barc.gov.in/favicon.ico",
  )
  addSearchLink(
    "CSIR",
    `https://www.csir.res.in/search/node/${encodedQuery}`,
    "Scientific Research",
    "https://www.csir.res.in/favicon.ico",
  )
  addSearchLink(
    "DST India",
    `https://dst.gov.in/?s=${encodedQuery}`,
    "Science & Technology",
    "https://dst.gov.in/favicon.ico",
  )
  addSearchLink(
    "NTA Exams",
    `https://nta.ac.in/search?q=${encodedQuery}`,
    "National Testing Agency",
    "https://nta.ac.in/favicon.ico",
  )
  addSearchLink(
    "UPSC",
    `https://www.upsc.gov.in/search/node/${encodedQuery}`,
    "Civil Services Exam",
    "https://www.upsc.gov.in/favicon.ico",
  )
  addSearchLink(
    "SSC India",
    `https://ssc.nic.in/search?q=${encodedQuery}`,
    "Staff Selection Commission",
    "https://ssc.nic.in/favicon.ico",
  )
  addSearchLink("IBPS", `https://www.ibps.in/search?q=${encodedQuery}`, "Bank Exams", "https://www.ibps.in/favicon.ico")

  // State Government Portals (A-Z)
  // Andaman & Nicobar
  addSearchLink(
    "Andaman Govt",
    `https://www.andaman.gov.in/search?q=${encodedQuery}`,
    "Andaman & Nicobar",
    "https://www.andaman.gov.in/favicon.ico",
  )
  // Andhra Pradesh
  addSearchLink(
    "AP Govt",
    `https://www.ap.gov.in/?s=${encodedQuery}`,
    "Andhra Pradesh Govt",
    "https://www.ap.gov.in/favicon.ico",
  )
  addSearchLink(
    "AP Online",
    `https://www.aponline.gov.in/search?q=${encodedQuery}`,
    "AP Services",
    "https://www.aponline.gov.in/favicon.ico",
  )
  addSearchLink(
    "Meeseva AP",
    `https://meeseva.ap.gov.in/search?q=${encodedQuery}`,
    "AP e-Services",
    "https://meeseva.ap.gov.in/favicon.ico",
  )
  // Arunachal Pradesh
  addSearchLink(
    "Arunachal Govt",
    `https://www.arunachalpradesh.gov.in/?s=${encodedQuery}`,
    "Arunachal Pradesh",
    "https://www.arunachalpradesh.gov.in/favicon.ico",
  )
  // Assam
  addSearchLink(
    "Assam Govt",
    `https://assam.gov.in/?s=${encodedQuery}`,
    "Assam Government",
    "https://assam.gov.in/favicon.ico",
  )
  addSearchLink(
    "Assam Online",
    `https://edistrict.assam.gov.in/search?q=${encodedQuery}`,
    "Assam e-District",
    "https://edistrict.assam.gov.in/favicon.ico",
  )
  // Bihar
  addSearchLink(
    "Bihar Govt",
    `https://state.bihar.gov.in/?s=${encodedQuery}`,
    "Bihar Government",
    "https://state.bihar.gov.in/favicon.ico",
  )
  addSearchLink(
    "RTPS Bihar",
    `https://serviceonline.bihar.gov.in/search?q=${encodedQuery}`,
    "Bihar Services",
    "https://serviceonline.bihar.gov.in/favicon.ico",
  )
  // Chandigarh
  addSearchLink(
    "Chandigarh Govt",
    `https://chandigarh.gov.in/?s=${encodedQuery}`,
    "Chandigarh UT",
    "https://chandigarh.gov.in/favicon.ico",
  )
  // Chhattisgarh
  addSearchLink(
    "CG Govt",
    `https://www.cgstate.gov.in/?s=${encodedQuery}`,
    "Chhattisgarh Govt",
    "https://www.cgstate.gov.in/favicon.ico",
  )
  addSearchLink(
    "CG Edistrict",
    `https://edistrict.cgstate.gov.in/search?q=${encodedQuery}`,
    "CG e-District",
    "https://edistrict.cgstate.gov.in/favicon.ico",
  )
  // Dadra & Nagar Haveli and Daman & Diu
  addSearchLink(
    "DNH DD Govt",
    `https://ddd.gov.in/?s=${encodedQuery}`,
    "DNH & Daman Diu",
    "https://ddd.gov.in/favicon.ico",
  )
  // Delhi
  addSearchLink(
    "Delhi Govt",
    `https://delhi.gov.in/?s=${encodedQuery}`,
    "Delhi Government",
    "https://delhi.gov.in/favicon.ico",
  )
  addSearchLink(
    "e-District Delhi",
    `https://edistrict.delhigovt.nic.in/search?q=${encodedQuery}`,
    "Delhi e-District",
    "https://edistrict.delhigovt.nic.in/favicon.ico",
  )
  // Goa
  addSearchLink(
    "Goa Govt",
    `https://www.goa.gov.in/?s=${encodedQuery}`,
    "Goa Government",
    "https://www.goa.gov.in/favicon.ico",
  )
  addSearchLink(
    "Goa Online",
    `https://goaonline.gov.in/search?q=${encodedQuery}`,
    "Goa Services",
    "https://goaonline.gov.in/favicon.ico",
  )
  // Gujarat
  addSearchLink(
    "Gujarat Govt",
    `https://gujaratindia.gov.in/?s=${encodedQuery}`,
    "Gujarat Government",
    "https://gujaratindia.gov.in/favicon.ico",
  )
  addSearchLink(
    "Digital Gujarat",
    `https://www.digitalgujarat.gov.in/search?q=${encodedQuery}`,
    "Gujarat Services",
    "https://www.digitalgujarat.gov.in/favicon.ico",
  )
  // Haryana
  addSearchLink(
    "Haryana Govt",
    `https://haryana.gov.in/?s=${encodedQuery}`,
    "Haryana Government",
    "https://haryana.gov.in/favicon.ico",
  )
  addSearchLink(
    "Saral Haryana",
    `https://saralharyana.gov.in/search?q=${encodedQuery}`,
    "Haryana Services",
    "https://saralharyana.gov.in/favicon.ico",
  )
  // Himachal Pradesh
  addSearchLink(
    "HP Govt",
    `https://himachal.nic.in/?s=${encodedQuery}`,
    "Himachal Pradesh",
    "https://himachal.nic.in/favicon.ico",
  )
  addSearchLink(
    "HP eDistrict",
    `https://edistrict.hp.gov.in/search?q=${encodedQuery}`,
    "HP e-District",
    "https://edistrict.hp.gov.in/favicon.ico",
  )
  // Jammu & Kashmir
  addSearchLink("JK Govt", `https://jk.gov.in/?s=${encodedQuery}`, "Jammu & Kashmir", "https://jk.gov.in/favicon.ico")
  // Jharkhand
  addSearchLink(
    "Jharkhand Govt",
    `https://www.jharkhand.gov.in/?s=${encodedQuery}`,
    "Jharkhand Govt",
    "https://www.jharkhand.gov.in/favicon.ico",
  )
  addSearchLink(
    "Jharsewa",
    `https://jharsewa.jharkhand.gov.in/search?q=${encodedQuery}`,
    "Jharkhand Services",
    "https://jharsewa.jharkhand.gov.in/favicon.ico",
  )
  // Karnataka
  addSearchLink(
    "Karnataka Govt",
    `https://www.karnataka.gov.in/?s=${encodedQuery}`,
    "Karnataka Govt",
    "https://www.karnataka.gov.in/favicon.ico",
  )
  addSearchLink(
    "Seva Sindhu",
    `https://sevasindhu.karnataka.gov.in/search?q=${encodedQuery}`,
    "Karnataka Services",
    "https://sevasindhu.karnataka.gov.in/favicon.ico",
  )
  addSearchLink(
    "Karnataka One",
    `https://www.karnatakaone.gov.in/search?q=${encodedQuery}`,
    "K1 Services",
    "https://www.karnatakaone.gov.in/favicon.ico",
  )
  // Kerala
  addSearchLink(
    "Kerala Govt",
    `https://kerala.gov.in/?s=${encodedQuery}`,
    "Kerala Government",
    "https://kerala.gov.in/favicon.ico",
  )
  addSearchLink(
    "Akshaya Kerala",
    `https://akshaya.kerala.gov.in/search?q=${encodedQuery}`,
    "Kerala e-Services",
    "https://akshaya.kerala.gov.in/favicon.ico",
  )
  // Ladakh
  addSearchLink(
    "Ladakh Govt",
    `https://ladakh.gov.in/?s=${encodedQuery}`,
    "Ladakh UT",
    "https://ladakh.gov.in/favicon.ico",
  )
  // Lakshadweep
  addSearchLink(
    "Lakshadweep Govt",
    `https://lakshadweep.gov.in/?s=${encodedQuery}`,
    "Lakshadweep UT",
    "https://lakshadweep.gov.in/favicon.ico",
  )
  // Madhya Pradesh
  addSearchLink(
    "MP Govt",
    `https://www.mp.gov.in/?s=${encodedQuery}`,
    "Madhya Pradesh",
    "https://www.mp.gov.in/favicon.ico",
  )
  addSearchLink(
    "MP Online",
    `https://mponline.gov.in/search?q=${encodedQuery}`,
    "MP Services",
    "https://mponline.gov.in/favicon.ico",
  )
  addSearchLink(
    "Samagra MP",
    `https://samagra.gov.in/search?q=${encodedQuery}`,
    "MP Samagra ID",
    "https://samagra.gov.in/favicon.ico",
  )
  // Maharashtra
  addSearchLink(
    "Maharashtra Govt",
    `https://maharashtra.gov.in/?s=${encodedQuery}`,
    "Maharashtra Govt",
    "https://maharashtra.gov.in/favicon.ico",
  )
  addSearchLink(
    "Aaple Sarkar",
    `https://aaplesarkar.mahaonline.gov.in/search?q=${encodedQuery}`,
    "Maharashtra Services",
    "https://aaplesarkar.mahaonline.gov.in/favicon.ico",
  )
  addSearchLink(
    "Maha eSevaKendra",
    `https://www.mahaonline.gov.in/search?q=${encodedQuery}`,
    "Maha Online",
    "https://www.mahaonline.gov.in/favicon.ico",
  )
  // Manipur
  addSearchLink(
    "Manipur Govt",
    `https://manipur.gov.in/?s=${encodedQuery}`,
    "Manipur Govt",
    "https://manipur.gov.in/favicon.ico",
  )
  // Meghalaya
  addSearchLink(
    "Meghalaya Govt",
    `https://meghalaya.gov.in/?s=${encodedQuery}`,
    "Meghalaya Govt",
    "https://meghalaya.gov.in/favicon.ico",
  )
  // Mizoram
  addSearchLink(
    "Mizoram Govt",
    `https://mizoram.gov.in/?s=${encodedQuery}`,
    "Mizoram Govt",
    "https://mizoram.gov.in/favicon.ico",
  )
  // Nagaland
  addSearchLink(
    "Nagaland Govt",
    `https://nagaland.gov.in/?s=${encodedQuery}`,
    "Nagaland Govt",
    "https://nagaland.gov.in/favicon.ico",
  )
  // Odisha
  addSearchLink(
    "Odisha Govt",
    `https://www.odisha.gov.in/?s=${encodedQuery}`,
    "Odisha Govt",
    "https://www.odisha.gov.in/favicon.ico",
  )
  addSearchLink(
    "Odisha One",
    `https://odishaone.gov.in/search?q=${encodedQuery}`,
    "Odisha Services",
    "https://odishaone.gov.in/favicon.ico",
  )
  // Puducherry
  addSearchLink(
    "Puducherry Govt",
    `https://py.gov.in/?s=${encodedQuery}`,
    "Puducherry UT",
    "https://py.gov.in/favicon.ico",
  )
  // Punjab
  addSearchLink(
    "Punjab Govt",
    `https://punjab.gov.in/?s=${encodedQuery}`,
    "Punjab Govt",
    "https://punjab.gov.in/favicon.ico",
  )
  addSearchLink(
    "Sewa Kendra Punjab",
    `httpseseawakendra.punjab.gov.in/search?q=${encodedQuery}`,
    "Punjab Services",
    "https://sewakendra.punjab.gov.in/favicon.ico",
  )
  // Rajasthan
  addSearchLink(
    "Rajasthan Govt",
    `https://www.rajasthan.gov.in/?s=${encodedQuery}`,
    "Rajasthan Govt",
    "https://www.rajasthan.gov.in/favicon.ico",
  )
  addSearchLink(
    "Raj eVault",
    `https://sso.rajasthan.gov.in/search?q=${encodedQuery}`,
    "Raj SSO",
    "https://sso.rajasthan.gov.in/favicon.ico",
  )
  addSearchLink(
    "Emitra Raj",
    `https://emitra.rajasthan.gov.in/search?q=${encodedQuery}`,
    "Rajasthan Emitra",
    "https://emitra.rajasthan.gov.in/favicon.ico",
  )
  // Sikkim
  addSearchLink(
    "Sikkim Govt",
    `https://sikkim.gov.in/?s=${encodedQuery}`,
    "Sikkim Govt",
    "https://sikkim.gov.in/favicon.ico",
  )
  // Tamil Nadu
  addSearchLink(
    "TN Govt",
    `https://www.tn.gov.in/?s=${encodedQuery}`,
    "Tamil Nadu Govt",
    "https://www.tn.gov.in/favicon.ico",
  )
  addSearchLink(
    "TN eServices",
    `https://tnedistrict.tn.gov.in/search?q=${encodedQuery}`,
    "TN e-District",
    "https://tnedistrict.tn.gov.in/favicon.ico",
  )
  addSearchLink(
    "TNPSC",
    `https://www.tnpsc.gov.in/search?q=${encodedQuery}`,
    "TN Public Service",
    "https://www.tnpsc.gov.in/favicon.ico",
  )
  // Telangana
  addSearchLink(
    "Telangana Govt",
    `https://www.telangana.gov.in/?s=${encodedQuery}`,
    "Telangana Govt",
    "https://www.telangana.gov.in/favicon.ico",
  )
  addSearchLink(
    "Mee Seva TS",
    `https://ts.meeseva.telangana.gov.in/search?q=${encodedQuery}`,
    "Telangana Services",
    "https://ts.meeseva.telangana.gov.in/favicon.ico",
  )
  addSearchLink(
    "T Hub",
    `https://www.t-hub.co/search?q=${encodedQuery}`,
    "Telangana Startup Hub",
    "https://www.t-hub.co/favicon.ico",
  )
  // Tripura
  addSearchLink(
    "Tripura Govt",
    `https://tripura.gov.in/?s=${encodedQuery}`,
    "Tripura Govt",
    "https://tripura.gov.in/favicon.ico",
  )
  // Uttar Pradesh
  addSearchLink(
    "UP Govt",
    `https://www.up.gov.in/?s=${encodedQuery}`,
    "Uttar Pradesh Govt",
    "https://www.up.gov.in/favicon.ico",
  )
  addSearchLink(
    "eSathi UP",
    `https://esathi.up.gov.in/search?q=${encodedQuery}`,
    "UP e-Sathi",
    "https://esathi.up.gov.in/favicon.ico",
  )
  addSearchLink(
    "Nivesh Mitra UP",
    `https://niveshmitra.up.nic.in/search?q=${encodedQuery}`,
    "UP Investment",
    "https://niveshmitra.up.nic.in/favicon.ico",
  )
  // Uttarakhand
  addSearchLink("UK Govt", `https://uk.gov.in/?s=${encodedQuery}`, "Uttarakhand Govt", "https://uk.gov.in/favicon.ico")
  addSearchLink(
    "eDistrict UK",
    `https://edistrict.uk.gov.in/search?q=${encodedQuery}`,
    "UK e-District",
    "https://edistrict.uk.gov.in/favicon.ico",
  )
  // West Bengal
  addSearchLink("WB Govt", `https://wb.gov.in/?s=${encodedQuery}`, "West Bengal Govt", "https://wb.gov.in/favicon.ico")
  addSearchLink(
    "Bangla Sahayata",
    `https://banglasahayata.wb.gov.in/search?q=${encodedQuery}`,
    "WB Help",
    "https://banglasahayata.wb.gov.in/favicon.ico",
  )
  addSearchLink(
    "eDisha WB",
    `https://edistrict.wb.gov.in/search?q=${encodedQuery}`,
    "WB e-District",
    "https://edistrict.wb.gov.in/favicon.ico",
  )

  // Indian News Sites (50+)
  addSearchLink(
    "Times of India",
    `https://timesofindia.indiatimes.com/topic/${encodedQuery}`,
    "TOI News",
    "https://timesofindia.indiatimes.com/favicon.ico",
  )
  addSearchLink(
    "Hindustan Times",
    `https://www.hindustantimes.com/search?q=${encodedQuery}`,
    "HT News",
    "https://www.hindustantimes.com/favicon.ico",
  )
  addSearchLink(
    "The Hindu",
    `https://www.thehindu.com/search/?q=${encodedQuery}`,
    "The Hindu",
    "https://www.thehindu.com/favicon.ico",
  )
  addSearchLink(
    "India Today",
    `https://www.indiatoday.in/search?q=${encodedQuery}`,
    "India Today",
    "https://www.indiatoday.in/favicon.ico",
  )
  addSearchLink(
    "NDTV",
    `https://www.ndtv.com/search?searchtext=${encodedQuery}`,
    "NDTV News",
    "https://www.ndtv.com/favicon.ico",
  )
  addSearchLink(
    "Indian Express",
    `https://indianexpress.com/?s=${encodedQuery}`,
    "Indian Express",
    "https://indianexpress.com/favicon.ico",
  )
  addSearchLink(
    "Economic Times",
    `https://economictimes.indiatimes.com/topic/${encodedQuery}`,
    "ET News",
    "https://economictimes.indiatimes.com/favicon.ico",
  )
  addSearchLink(
    "Business Standard",
    `https://www.business-standard.com/search?q=${encodedQuery}`,
    "BS News",
    "https://www.business-standard.com/favicon.ico",
  )
  addSearchLink(
    "Mint",
    `https://www.livemint.com/Search/Link/Keyword/${encodedQuery}`,
    "Livemint",
    "https://www.livemint.com/favicon.ico",
  )
  addSearchLink(
    "Financial Express",
    `https://www.financialexpress.com/?s=${encodedQuery}`,
    "FE News",
    "https://www.financialexpress.com/favicon.ico",
  )
  addSearchLink(
    "Zee News",
    `https://zeenews.india.com/search?q=${encodedQuery}`,
    "Zee News",
    "https://zeenews.india.com/favicon.ico",
  )
  addSearchLink(
    "Republic World",
    `https://www.republicworld.com/search?q=${encodedQuery}`,
    "Republic TV",
    "https://www.republicworld.com/favicon.ico",
  )
  addSearchLink(
    "ABP News",
    `https://news.abplive.com/search?q=${encodedQuery}`,
    "ABP Live",
    "https://news.abplive.com/favicon.ico",
  )
  addSearchLink(
    "Aaj Tak",
    `https://www.aajtak.in/search?q=${encodedQuery}`,
    "Aaj Tak",
    "https://www.aajtak.in/favicon.ico",
  )
  addSearchLink(
    "News18",
    `https://www.news18.com/search?q=${encodedQuery}`,
    "News18",
    "https://www.news18.com/favicon.ico",
  )
  addSearchLink(
    "Firstpost",
    `https://www.firstpost.com/search/${encodedQuery}`,
    "Firstpost",
    "https://www.firstpost.com/favicon.ico",
  )
  addSearchLink("The Wire", `https://thewire.in/?s=${encodedQuery}`, "The Wire", "https://thewire.in/favicon.ico")
  addSearchLink(
    "Scroll.in",
    `https://scroll.in/search?q=${encodedQuery}`,
    "Scroll News",
    "https://scroll.in/favicon.ico",
  )
  addSearchLink("The Print", `https://theprint.in/?s=${encodedQuery}`, "The Print", "https://theprint.in/favicon.ico")
  addSearchLink(
    "The Quint",
    `https://www.thequint.com/search?q=${encodedQuery}`,
    "The Quint",
    "https://www.thequint.com/favicon.ico",
  )
  addSearchLink(
    "Deccan Herald",
    `https://www.deccanherald.com/search?q=${encodedQuery}`,
    "Deccan Herald",
    "https://www.deccanherald.com/favicon.ico",
  )
  addSearchLink(
    "Deccan Chronicle",
    `https://www.deccanchronicle.com/search?q=${encodedQuery}`,
    "Deccan Chronicle",
    "https://www.deccanchronicle.com/favicon.ico",
  )
  addSearchLink(
    "The Telegraph",
    `https://www.telegraphindia.com/search?q=${encodedQuery}`,
    "Telegraph India",
    "https://www.telegraphindia.com/favicon.ico",
  )
  addSearchLink(
    "The Statesman",
    `https://www.thestatesman.com/?s=${encodedQuery}`,
    "The Statesman",
    "https://www.thestatesman.com/favicon.ico",
  )
  addSearchLink(
    "DNA India",
    `https://www.dnaindia.com/search?q=${encodedQuery}`,
    "DNA India",
    "https://www.dnaindia.com/favicon.ico",
  )
  addSearchLink(
    "Mid-Day",
    `https://www.mid-day.com/search?q=${encodedQuery}`,
    "Mid-Day Mumbai",
    "https://www.mid-day.com/favicon.ico",
  )
  addSearchLink(
    "Mumbai Mirror",
    `https://mumbaimirror.indiatimes.com/search?q=${encodedQuery}`,
    "Mumbai Mirror",
    "https://mumbaimirror.indiatimes.com/favicon.ico",
  )
  addSearchLink(
    "Tribune India",
    `https://www.tribuneindia.com/search?q=${encodedQuery}`,
    "The Tribune",
    "https://www.tribuneindia.com/favicon.ico",
  )
  addSearchLink(
    "Outlook India",
    `https://www.outlookindia.com/search?q=${encodedQuery}`,
    "Outlook",
    "https://www.outlookindia.com/favicon.ico",
  )
  addSearchLink(
    "The Week",
    `https://www.theweek.in/search.html?q=${encodedQuery}`,
    "The Week",
    "https://www.theweek.in/favicon.ico",
  )
  addSearchLink(
    "Frontline",
    `https://frontline.thehindu.com/search/?q=${encodedQuery}`,
    "Frontline Magazine",
    "https://frontline.thehindu.com/favicon.ico",
  )
  addSearchLink(
    "Swarajya",
    `https://swarajyamag.com/?s=${encodedQuery}`,
    "Swarajya Mag",
    "https://swarajyamag.com/favicon.ico",
  )
  addSearchLink(
    "OpIndia",
    `https://www.opindia.com/?s=${encodedQuery}`,
    "OpIndia",
    "https://www.opindia.com/favicon.ico",
  )
  addSearchLink(
    "NewsLaundry",
    `https://www.newslaundry.com/?s=${encodedQuery}`,
    "Newslaundry",
    "https://www.newslaundry.com/favicon.ico",
  )
  addSearchLink(
    "Alt News",
    `https://www.altnews.in/?s=${encodedQuery}`,
    "Alt News",
    "https://www.altnews.in/favicon.ico",
  )
  addSearchLink(
    "Moneycontrol",
    `https://www.moneycontrol.com/news/search?search_str=${encodedQuery}`,
    "Moneycontrol",
    "https://www.moneycontrol.com/favicon.ico",
  )
  addSearchLink(
    "CNBC TV18",
    `https://www.cnbctv18.com/search/?q=${encodedQuery}`,
    "CNBC TV18",
    "https://www.cnbctv18.com/favicon.ico",
  )
  addSearchLink(
    "Bloomberg Quint",
    `https://www.bloombergquint.com/search?q=${encodedQuery}`,
    "BQ Prime",
    "https://www.bloombergquint.com/favicon.ico",
  )
  addSearchLink("Inc42", `https://inc42.com/?s=${encodedQuery}`, "Inc42 Startups", "https://inc42.com/favicon.ico")
  addSearchLink(
    "YourStory",
    `https://yourstory.com/search?q=${encodedQuery}`,
    "YourStory",
    "https://yourstory.com/favicon.ico",
  )
  addSearchLink("Entrackr", `https://entrackr.com/?s=${encodedQuery}`, "Entrackr", "https://entrackr.com/favicon.ico")
  addSearchLink(
    "TechCircle",
    `https://www.techcircle.in/search?q=${encodedQuery}`,
    "TechCircle",
    "https://www.techcircle.in/favicon.ico",
  )
  addSearchLink(
    "Gadgets 360",
    `https://www.gadgets360.com/search?searchtext=${encodedQuery}`,
    "NDTV Gadgets",
    "https://www.gadgets360.com/favicon.ico",
  )
  addSearchLink(
    "91mobiles",
    `https://www.91mobiles.com/search?q=${encodedQuery}`,
    "91mobiles",
    "https://www.91mobiles.com/favicon.ico",
  )
  addSearchLink("Beebom", `https://beebom.com/?s=${encodedQuery}`, "Beebom Tech", "https://beebom.com/favicon.ico")
  addSearchLink(
    "Indian Defence News",
    `https://www.india.com/defence/?s=${encodedQuery}`,
    "India Defence",
    "https://www.india.com/favicon.ico",
  )
  addSearchLink(
    "Sports Tak",
    `https://www.sportstak.com/search?q=${encodedQuery}`,
    "Sports Tak",
    "https://www.sportstak.com/favicon.ico",
  )
  addSearchLink(
    "Cricbuzz",
    `https://www.cricbuzz.com/search?q=${encodedQuery}`,
    "Cricbuzz",
    "https://www.cricbuzz.com/favicon.ico",
  )
  addSearchLink(
    "ESPNcricinfo",
    `https://www.espncricinfo.com/ci/content/site/search.html?search=${encodedQuery}`,
    "Cricinfo",
    "https://www.espncricinfo.com/favicon.ico",
  )
  addSearchLink(
    "Sportskeeda",
    `https://www.sportskeeda.com/search?q=${encodedQuery}`,
    "Sportskeeda",
    "https://www.sportskeeda.com/favicon.ico",
  )
  addSearchLink(
    "Jagran",
    `https://www.jagran.com/search?q=${encodedQuery}`,
    "Dainik Jagran",
    "https://www.jagran.com/favicon.ico",
  )
  addSearchLink(
    "Dainik Bhaskar",
    `https://www.bhaskar.com/search?q=${encodedQuery}`,
    "Dainik Bhaskar",
    "https://www.bhaskar.com/favicon.ico",
  )
  addSearchLink(
    "Navbharat Times",
    `https://navbharattimes.indiatimes.com/topic/${encodedQuery}`,
    "NBT Hindi",
    "https://navbharattimes.indiatimes.com/favicon.ico",
  )
  addSearchLink(
    "Amar Ujala",
    `https://www.amarujala.com/search?q=${encodedQuery}`,
    "Amar Ujala",
    "https://www.amarujala.com/favicon.ico",
  )
  addSearchLink(
    "Patrika",
    `https://www.patrika.com/search?q=${encodedQuery}`,
    "Rajasthan Patrika",
    "https://www.patrika.com/favicon.ico",
  )
  addSearchLink(
    "Livehindustan",
    `https://www.livehindustan.com/search?q=${encodedQuery}`,
    "Live Hindustan",
    "https://www.livehindustan.com/favicon.ico",
  )
  addSearchLink(
    "Jansatta",
    `https://www.jansatta.com/?s=${encodedQuery}`,
    "Jansatta",
    "https://www.jansatta.com/favicon.ico",
  )
  addSearchLink(
    "Punjab Kesari",
    `https://www.punjabkesari.in/search?q=${encodedQuery}`,
    "Punjab Kesari",
    "https://www.punjabkesari.in/favicon.ico",
  )
  addSearchLink(
    "Lokmat",
    `https://www.lokmat.com/search/?query=${encodedQuery}`,
    "Lokmat Marathi",
    "https://www.lokmat.com/favicon.ico",
  )
  addSearchLink(
    "Sakaal",
    `https://www.esakal.com/search/${encodedQuery}`,
    "Sakal Marathi",
    "https://www.esakal.com/favicon.ico",
  )
  addSearchLink(
    "Mathrubhumi",
    `https://www.mathrubhumi.com/search?q=${encodedQuery}`,
    "Mathrubhumi",
    "https://www.mathrubhumi.com/favicon.ico",
  )
  addSearchLink(
    "Manorama Online",
    `https://www.manoramaonline.com/search.html?q=${encodedQuery}`,
    "Malayala Manorama",
    "https://www.manoramaonline.com/favicon.ico",
  )
  addSearchLink(
    "Dinamalar",
    `https://www.dinamalar.com/search_results.asp?search=${encodedQuery}`,
    "Dinamalar Tamil",
    "https://www.dinamalar.com/favicon.ico",
  )
  addSearchLink(
    "Dinamani",
    `https://www.dinamani.com/search?q=${encodedQuery}`,
    "Dinamani Tamil",
    "https://www.dinamani.com/favicon.ico",
  )
  addSearchLink(
    "Eenadu",
    `https://www.eenadu.net/search?q=${encodedQuery}`,
    "Eenadu Telugu",
    "https://www.eenadu.net/favicon.ico",
  )
  addSearchLink(
    "Sakshi",
    `https://www.sakshi.com/search?q=${encodedQuery}`,
    "Sakshi Telugu",
    "https://www.sakshi.com/favicon.ico",
  )
  addSearchLink(
    "Anandabazar",
    `https://www.anandabazar.com/search?q=${encodedQuery}`,
    "Anandabazar Bengali",
    "https://www.anandabazar.com/favicon.ico",
  )
  addSearchLink(
    "Ei Samay",
    `https://eisamay.indiatimes.com/topic/${encodedQuery}`,
    "Ei Samay Bengali",
    "https://eisamay.indiatimes.com/favicon.ico",
  )
  addSearchLink(
    "Bartaman",
    `https://bartamanpatrika.com/?s=${encodedQuery}`,
    "Bartaman Bengali",
    "https://bartamanpatrika.com/favicon.ico",
  )
  addSearchLink("Sambad", `https://sambad.in/?s=${encodedQuery}`, "Sambad Odia", "https://sambad.in/favicon.ico")
  addSearchLink(
    "Prajavani",
    `https://www.prajavani.net/search?q=${encodedQuery}`,
    "Prajavani Kannada",
    "https://www.prajavani.net/favicon.ico",
  )
  addSearchLink(
    "Vijaya Karnataka",
    `https://vijaykarnataka.com/topic/${encodedQuery}`,
    "Vijay Karnataka",
    "https://vijaykarnataka.com/favicon.ico",
  )
  addSearchLink(
    "Gujarat Samachar",
    `https://www.gujaratsamachar.com/search?q=${encodedQuery}`,
    "Gujarat Samachar",
    "https://www.gujaratsamachar.com/favicon.ico",
  )
  addSearchLink(
    "Divya Bhaskar",
    `https://www.divyabhaskar.co.in/search?q=${encodedQuery}`,
    "Divya Bhaskar",
    "https://www.divyabhaskar.co.in/favicon.ico",
  )
  addSearchLink(
    "Asomiya Pratidin",
    `https://www.asomiyapratidin.in/?s=${encodedQuery}`,
    "Asomiya Pratidin",
    "https://www.asomiyapratidin.in/favicon.ico",
  )
  addSearchLink(
    "Dainik Assam",
    `https://www.dainikassam.com/?s=${encodedQuery}`,
    "Dainik Assam",
    "https://www.dainikassam.com/favicon.ico",
  )

  // ============= DIRECT SEARCH LINKS (200+ sources) =============

  // Search Engines (20+)
  addSearchLink(
    "Google",
    `https://www.google.com/search?q=${encodedQuery}`,
    "Web search",
    "https://www.google.com/favicon.ico",
  )
  addSearchLink(
    "Bing",
    `https://www.bing.com/search?q=${encodedQuery}`,
    "Microsoft search",
    "https://www.bing.com/favicon.ico",
  )
  addSearchLink(
    "Yahoo",
    `https://search.yahoo.com/search?p=${encodedQuery}`,
    "Yahoo search",
    "https://www.yahoo.com/favicon.ico",
  )
  addSearchLink(
    "Yandex",
    `https://yandex.com/search/?text=${encodedQuery}`,
    "Russian search",
    "https://yandex.com/favicon.ico",
  )
  addSearchLink(
    "Baidu",
    `https://www.baidu.com/s?wd=${encodedQuery}`,
    "Chinese search",
    "https://www.baidu.com/favicon.ico",
  )
  addSearchLink(
    "Ecosia",
    `https://www.ecosia.org/search?q=${encodedQuery}`,
    "Eco-friendly search",
    "https://www.ecosia.org/favicon.ico",
  )
  addSearchLink(
    "Qwant",
    `https://www.qwant.com/?q=${encodedQuery}`,
    "Privacy search",
    "https://www.qwant.com/favicon.ico",
  )
  addSearchLink(
    "Startpage",
    `https://www.startpage.com/do/search?q=${encodedQuery}`,
    "Private Google",
    "https://www.startpage.com/favicon.ico",
  )
  addSearchLink(
    "Brave Search",
    `https://search.brave.com/search?q=${encodedQuery}`,
    "Brave browser search",
    "https://brave.com/favicon.ico",
  )
  addSearchLink(
    "Mojeek",
    `https://www.mojeek.com/search?q=${encodedQuery}`,
    "Independent search",
    "https://www.mojeek.com/favicon.ico",
  )
  addSearchLink(
    "Swisscows",
    `https://swisscows.com/web?query=${encodedQuery}`,
    "Swiss privacy search",
    "https://swisscows.com/favicon.ico",
  )
  addSearchLink(
    "MetaGer",
    `https://metager.org/meta/meta.ger3?eingabe=${encodedQuery}`,
    "Meta search",
    "https://metager.org/favicon.ico",
  )
  addSearchLink(
    "Searx",
    `https://searx.be/search?q=${encodedQuery}`,
    "Open source search",
    "https://searx.be/favicon.ico",
  )
  addSearchLink(
    "Gibiru",
    `https://gibiru.com/results.html?q=${encodedQuery}`,
    "Uncensored search",
    "https://gibiru.com/favicon.ico",
  )
  addSearchLink(
    "Dogpile",
    `https://www.dogpile.com/serp?q=${encodedQuery}`,
    "Meta search",
    "https://www.dogpile.com/favicon.ico",
  )
  addSearchLink(
    "WebCrawler",
    `https://www.webcrawler.com/serp?q=${encodedQuery}`,
    "Classic search",
    "https://www.webcrawler.com/favicon.ico",
  )
  addSearchLink(
    "Info.com",
    `https://www.info.com/serp?q=${encodedQuery}`,
    "Info search",
    "https://www.info.com/favicon.ico",
  )
  addSearchLink(
    "Excite",
    `https://www.excite.com/search/${encodedQuery}`,
    "Classic search",
    "https://www.excite.com/favicon.ico",
  )
  addSearchLink(
    "Lycos",
    `https://search.lycos.com/web?q=${encodedQuery}`,
    "Classic search",
    "https://www.lycos.com/favicon.ico",
  )
  addSearchLink(
    "Ask.com",
    `https://www.ask.com/web?q=${encodedQuery}`,
    "Question search",
    "https://www.ask.com/favicon.ico",
  )

  // Video Platforms (15+)
  addSearchLink(
    "YouTube",
    `https://www.youtube.com/results?search_query=${encodedQuery}`,
    "Videos",
    "https://www.youtube.com/favicon.ico",
  )
  addSearchLink(
    "Vimeo",
    `https://vimeo.com/search?q=${encodedQuery}`,
    "Creative videos",
    "https://vimeo.com/favicon.ico",
  )
  addSearchLink(
    "Dailymotion",
    `https://www.dailymotion.com/search/${encodedQuery}`,
    "Videos",
    "https://www.dailymotion.com/favicon.ico",
  )
  addSearchLink(
    "Twitch",
    `https://www.twitch.tv/search?term=${encodedQuery}`,
    "Live streams",
    "https://www.twitch.tv/favicon.ico",
  )
  addSearchLink(
    "TikTok",
    `https://www.tiktok.com/search?q=${encodedQuery}`,
    "Short videos",
    "https://www.tiktok.com/favicon.ico",
  )
  addSearchLink(
    "Rumble",
    `https://rumble.com/search/video?q=${encodedQuery}`,
    "Video platform",
    "https://rumble.com/favicon.ico",
  )
  addSearchLink(
    "PeerTube",
    `https://sepiasearch.org/search?search=${encodedQuery}`,
    "Decentralized video",
    "https://joinpeertube.org/favicon.ico",
  )
  addSearchLink(
    "Odysee",
    `https://odysee.com/$/search?q=${encodedQuery}`,
    "Decentralized video",
    "https://odysee.com/favicon.ico",
  )
  addSearchLink(
    "BitChute",
    `https://www.bitchute.com/search/?query=${encodedQuery}`,
    "Alt video",
    "https://www.bitchute.com/favicon.ico",
  )
  addSearchLink(
    "Veoh",
    `https://www.veoh.com/find/${encodedQuery}`,
    "Video sharing",
    "https://www.veoh.com/favicon.ico",
  )
  addSearchLink(
    "Metacafe",
    `https://www.metacafe.com/topics/${encodedQuery}`,
    "Short videos",
    "https://www.metacafe.com/favicon.ico",
  )
  addSearchLink(
    "Facebook Watch",
    `https://www.facebook.com/watch/search/?q=${encodedQuery}`,
    "Facebook videos",
    "https://www.facebook.com/favicon.ico",
  )
  addSearchLink(
    "Instagram Reels",
    `https://www.instagram.com/explore/tags/${query.replace(/ /g, "")}`,
    "Short videos",
    "https://www.instagram.com/favicon.ico",
  )
  addSearchLink(
    "Bilibili",
    `https://search.bilibili.com/all?keyword=${encodedQuery}`,
    "Chinese videos",
    "https://www.bilibili.com/favicon.ico",
  )
  addSearchLink(
    "NicoNico",
    `https://www.nicovideo.jp/search/${encodedQuery}`,
    "Japanese videos",
    "https://www.nicovideo.jp/favicon.ico",
  )

  // Social Media (20+)
  addSearchLink(
    "Twitter/X",
    `https://twitter.com/search?q=${encodedQuery}`,
    "Tweets",
    "https://twitter.com/favicon.ico",
  )
  addSearchLink(
    "Reddit",
    `https://www.reddit.com/search/?q=${encodedQuery}`,
    "Communities",
    "https://www.reddit.com/favicon.ico",
  )
  addSearchLink(
    "Facebook",
    `https://www.facebook.com/search/top?q=${encodedQuery}`,
    "Social network",
    "https://www.facebook.com/favicon.ico",
  )
  addSearchLink(
    "Instagram",
    `https://www.instagram.com/explore/tags/${query.replace(/ /g, "")}`,
    "Photos",
    "https://www.instagram.com/favicon.ico",
  )
  addSearchLink(
    "LinkedIn",
    `https://www.linkedin.com/search/results/all/?keywords=${encodedQuery}`,
    "Professional",
    "https://www.linkedin.com/favicon.ico",
  )
  addSearchLink(
    "Pinterest",
    `https://www.pinterest.com/search/pins/?q=${encodedQuery}`,
    "Ideas",
    "https://www.pinterest.com/favicon.ico",
  )
  addSearchLink(
    "Tumblr",
    `https://www.tumblr.com/search/${encodedQuery}`,
    "Blogs",
    "https://www.tumblr.com/favicon.ico",
  )
  addSearchLink("Quora", `https://www.quora.com/search?q=${encodedQuery}`, "Q&A", "https://www.quora.com/favicon.ico")
  addSearchLink(
    "Discord Servers",
    `https://disboard.org/search?keyword=${encodedQuery}`,
    "Communities",
    "https://discord.com/favicon.ico",
  )
  addSearchLink("Telegram", `https://t.me/s/${query.replace(/ /g, "")}`, "Channels", "https://telegram.org/favicon.ico")
  addSearchLink(
    "Mastodon",
    `https://mastodon.social/search?q=${encodedQuery}`,
    "Decentralized social",
    "https://mastodon.social/favicon.ico",
  )
  addSearchLink(
    "Bluesky",
    `https://bsky.app/search?q=${encodedQuery}`,
    "Decentralized social",
    "https://bsky.app/favicon.ico",
  )
  addSearchLink(
    "Threads",
    `https://www.threads.net/search?q=${encodedQuery}`,
    "Meta social",
    "https://www.threads.net/favicon.ico",
  )
  addSearchLink("VK", `https://vk.com/search?c%5Bq%5D=${encodedQuery}`, "Russian social", "https://vk.com/favicon.ico")
  addSearchLink(
    "Weibo",
    `https://s.weibo.com/weibo?q=${encodedQuery}`,
    "Chinese social",
    "https://weibo.com/favicon.ico",
  )
  addSearchLink(
    "Snapchat",
    `https://www.snapchat.com/discover/${encodedQuery}`,
    "Stories",
    "https://www.snapchat.com/favicon.ico",
  )
  addSearchLink("WhatsApp", `https://web.whatsapp.com/`, "Messaging", "https://www.whatsapp.com/favicon.ico")
  addSearchLink("Signal", `https://signal.org/`, "Secure messaging", "https://signal.org/favicon.ico")
  addSearchLink(
    "Clubhouse",
    `https://www.clubhouse.com/search/${encodedQuery}`,
    "Audio social",
    "https://www.clubhouse.com/favicon.ico",
  )
  addSearchLink("BeReal", `https://bereal.com/`, "Photo sharing", "https://bereal.com/favicon.ico")

  // Music & Audio (15+)
  addSearchLink(
    "Spotify",
    `https://open.spotify.com/search/${encodedQuery}`,
    "Music streaming",
    "https://open.spotify.com/favicon.ico",
  )
  addSearchLink(
    "SoundCloud",
    `https://soundcloud.com/search?q=${encodedQuery}`,
    "Audio",
    "https://soundcloud.com/favicon.ico",
  )
  addSearchLink(
    "Apple Music",
    `https://music.apple.com/search?term=${encodedQuery}`,
    "Music",
    "https://music.apple.com/favicon.ico",
  )
  addSearchLink(
    "Deezer",
    `https://www.deezer.com/search/${encodedQuery}`,
    "Music",
    "https://www.deezer.com/favicon.ico",
  )
  addSearchLink(
    "Tidal",
    `https://tidal.com/browse/search?q=${encodedQuery}`,
    "HiFi music",
    "https://tidal.com/favicon.ico",
  )
  addSearchLink(
    "Bandcamp",
    `https://bandcamp.com/search?q=${encodedQuery}`,
    "Indie music",
    "https://bandcamp.com/favicon.ico",
  )
  addSearchLink(
    "Last.fm",
    `https://www.last.fm/search?q=${encodedQuery}`,
    "Music discovery",
    "https://www.last.fm/favicon.ico",
  )
  addSearchLink("Genius", `https://genius.com/search?q=${encodedQuery}`, "Lyrics", "https://genius.com/favicon.ico")
  addSearchLink(
    "Shazam",
    `https://www.shazam.com/search/${encodedQuery}`,
    "Song ID",
    "https://www.shazam.com/favicon.ico",
  )
  addSearchLink(
    "Mixcloud",
    `https://www.mixcloud.com/search/?q=${encodedQuery}`,
    "DJ mixes",
    "https://www.mixcloud.com/favicon.ico",
  )
  addSearchLink(
    "Audible",
    `https://www.audible.com/search?keywords=${encodedQuery}`,
    "Audiobooks",
    "https://www.audible.com/favicon.ico",
  )
  addSearchLink(
    "Podcast Addict",
    `https://podcastaddict.com/search?q=${encodedQuery}`,
    "Podcasts",
    "https://podcastaddict.com/favicon.ico",
  )
  addSearchLink("Anchor", `https://anchor.fm/`, "Podcast hosting", "https://anchor.fm/favicon.ico")
  addSearchLink(
    "JioSaavn",
    `https://www.jiosaavn.com/search/${encodedQuery}`,
    "Indian music",
    "https://www.jiosaavn.com/favicon.ico",
  )
  addSearchLink("Gaana", `https://gaana.com/search/${encodedQuery}`, "Indian music", "https://gaana.com/favicon.ico")
  addSearchLink("Wynk", `https://wynk.in/music/search/${encodedQuery}`, "Indian music", "https://wynk.in/favicon.ico")

  // News Sources (30+)
  addSearchLink(
    "Google News",
    `https://news.google.com/search?q=${encodedQuery}`,
    "News aggregator",
    "https://news.google.com/favicon.ico",
  )
  addSearchLink("BBC", `https://www.bbc.co.uk/search?q=${encodedQuery}`, "UK news", "https://www.bbc.co.uk/favicon.ico")
  addSearchLink(
    "CNN",
    `https://edition.cnn.com/search?q=${encodedQuery}`,
    "US news",
    "https://edition.cnn.com/favicon.ico",
  )
  addSearchLink(
    "Reuters",
    `https://www.reuters.com/search/news?blob=${encodedQuery}`,
    "World news",
    "https://www.reuters.com/favicon.ico",
  )
  addSearchLink(
    "AP News",
    `https://apnews.com/search?q=${encodedQuery}`,
    "Wire service",
    "https://apnews.com/favicon.ico",
  )
  addSearchLink(
    "The Guardian",
    `https://www.theguardian.com/search?q=${encodedQuery}`,
    "UK news",
    "https://www.theguardian.com/favicon.ico",
  )
  addSearchLink(
    "NYT",
    `https://www.nytimes.com/search?query=${encodedQuery}`,
    "US news",
    "https://www.nytimes.com/favicon.ico",
  )
  addSearchLink(
    "Washington Post",
    `https://www.washingtonpost.com/search/?query=${encodedQuery}`,
    "US news",
    "https://www.washingtonpost.com/favicon.ico",
  )
  addSearchLink(
    "Al Jazeera",
    `https://www.aljazeera.com/search/${encodedQuery}`,
    "World news",
    "https://www.aljazeera.com/favicon.ico",
  )
  addSearchLink(
    "France 24",
    `https://www.france24.com/en/search?query=${encodedQuery}`,
    "French news",
    "https://www.france24.com/favicon.ico",
  )
  addSearchLink(
    "DW",
    `https://www.dw.com/search/?item=${encodedQuery}`,
    "German news",
    "https://www.dw.com/favicon.ico",
  )
  // Removed duplicate Indian News Sites as they are now in the dedicated section.
  // Re-adding them here to ensure the total count of news sources remains high.
  addSearchLink(
    "Times of India",
    `https://timesofindia.indiatimes.com/topic/${encodedQuery}`,
    "Indian news",
    "https://timesofindia.indiatimes.com/favicon.ico",
  )
  addSearchLink(
    "NDTV",
    `https://www.ndtv.com/search?searchtext=${encodedQuery}`,
    "Indian news",
    "https://www.ndtv.com/favicon.ico",
  )
  addSearchLink(
    "The Hindu",
    `https://www.thehindu.com/search/?q=${encodedQuery}`,
    "Indian news",
    "https://www.thehindu.com/favicon.ico",
  )
  addSearchLink(
    "India Today",
    `https://www.indiatoday.in/search/${encodedQuery}`,
    "Indian news",
    "https://www.indiatoday.in/favicon.ico",
  )
  addSearchLink(
    "Hindustan Times",
    `https://www.hindustantimes.com/search?q=${encodedQuery}`,
    "Indian news",
    "https://www.hindustantimes.com/favicon.ico",
  )
  addSearchLink(
    "Indian Express",
    `https://indianexpress.com/?s=${encodedQuery}`,
    "Indian news",
    "https://indianexpress.com/favicon.ico",
  )
  addSearchLink(
    "Zee News",
    `https://zeenews.india.com/search?q=${encodedQuery}`,
    "Indian news",
    "https://zeenews.india.com/favicon.ico",
  )
  addSearchLink(
    "ABP News",
    `https://news.abplive.com/search?s=${encodedQuery}`,
    "Indian news",
    "https://news.abplive.com/favicon.ico",
  )
  addSearchLink(
    "Aaj Tak",
    `https://www.aajtak.in/search?q=${encodedQuery}`,
    "Hindi news",
    "https://www.aajtak.in/favicon.ico",
  )
  addSearchLink(
    "Dainik Bhaskar",
    `https://www.bhaskar.com/search?q=${encodedQuery}`,
    "Hindi news",
    "https://www.bhaskar.com/favicon.ico",
  )
  addSearchLink(
    "Navbharat Times",
    `https://navbharattimes.indiatimes.com/topic/${encodedQuery}`,
    "Hindi news",
    "https://navbharattimes.indiatimes.com/favicon.ico",
  )
  addSearchLink(
    "Economic Times",
    `https://economictimes.indiatimes.com/searchresult.cms?query=${encodedQuery}`,
    "Business news",
    "https://economictimes.indiatimes.com/favicon.ico",
  )
  addSearchLink(
    "Mint",
    `https://www.livemint.com/Search/Link/Keyword/${encodedQuery}`,
    "Business news",
    "https://www.livemint.com/favicon.ico",
  )
  addSearchLink(
    "Business Standard",
    `https://www.business-standard.com/search?q=${encodedQuery}`,
    "Business news",
    "https://www.business-standard.com/favicon.ico",
  )
  addSearchLink(
    "Forbes",
    `https://www.forbes.com/search/?q=${encodedQuery}`,
    "Business",
    "https://www.forbes.com/favicon.ico",
  )
  addSearchLink(
    "Bloomberg",
    `https://www.bloomberg.com/search?query=${encodedQuery}`,
    "Finance",
    "https://www.bloomberg.com/favicon.ico",
  )
  addSearchLink(
    "TechCrunch",
    `https://techcrunch.com/search/${encodedQuery}`,
    "Tech news",
    "https://techcrunch.com/favicon.ico",
  )
  addSearchLink(
    "The Verge",
    `https://www.theverge.com/search?q=${encodedQuery}`,
    "Tech news",
    "https://www.theverge.com/favicon.ico",
  )
  addSearchLink(
    "Wired",
    `https://www.wired.com/search/?q=${encodedQuery}`,
    "Tech news",
    "https://www.wired.com/favicon.ico",
  )
  addSearchLink(
    "Ars Technica",
    `https://arstechnica.com/search/?query=${encodedQuery}`,
    "Tech news",
    "https://arstechnica.com/favicon.ico",
  )
  addSearchLink(
    "Engadget",
    `https://www.engadget.com/search/?search-terms=${encodedQuery}`,
    "Tech news",
    "https://www.engadget.com/favicon.ico",
  )

  // Shopping (25+)
  addSearchLink(
    "Amazon India",
    `https://www.amazon.in/s?k=${encodedQuery}`,
    "Shopping",
    "https://www.amazon.in/favicon.ico",
  )
  addSearchLink(
    "Amazon US",
    `https://www.amazon.com/s?k=${encodedQuery}`,
    "Shopping",
    "https://www.amazon.com/favicon.ico",
  )
  addSearchLink(
    "Flipkart",
    `https://www.flipkart.com/search?q=${encodedQuery}`,
    "Indian shopping",
    "https://www.flipkart.com/favicon.ico",
  )
  addSearchLink("Myntra", `https://www.myntra.com/${encodedQuery}`, "Fashion", "https://www.myntra.com/favicon.ico")
  addSearchLink(
    "Ajio",
    `https://www.ajio.com/search/?text=${encodedQuery}`,
    "Fashion",
    "https://www.ajio.com/favicon.ico",
  )
  addSearchLink(
    "Snapdeal",
    `https://www.snapdeal.com/search?keyword=${encodedQuery}`,
    "Shopping",
    "https://www.snapdeal.com/favicon.ico",
  )
  addSearchLink(
    "Meesho",
    `https://www.meesho.com/search?q=${encodedQuery}`,
    "Social commerce",
    "https://www.meesho.com/favicon.ico",
  )
  addSearchLink(
    "Tata Cliq",
    `https://www.tatacliq.com/search/?searchCategory=all&text=${encodedQuery}`,
    "Shopping",
    "https://www.tatacliq.com/favicon.ico",
  )
  addSearchLink(
    "Nykaa",
    `https://www.nykaa.com/search/result/?q=${encodedQuery}`,
    "Beauty",
    "https://www.nykaa.com/favicon.ico",
  )
  addSearchLink(
    "BigBasket",
    `https://www.bigbasket.com/ps/?q=${encodedQuery}`,
    "Groceries",
    "https://www.bigbasket.com/favicon.ico",
  )
  addSearchLink(
    "Blinkit",
    `https://blinkit.com/s/?q=${encodedQuery}`,
    "Quick commerce",
    "https://blinkit.com/favicon.ico",
  )
  addSearchLink(
    "Zepto",
    `https://www.zeptonow.com/search?query=${encodedQuery}`,
    "Quick commerce",
    "https://www.zeptonow.com/favicon.ico",
  )
  addSearchLink(
    "eBay",
    `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}`,
    "Auctions",
    "https://www.ebay.com/favicon.ico",
  )
  addSearchLink(
    "AliExpress",
    `https://www.aliexpress.com/wholesale?SearchText=${encodedQuery}`,
    "Chinese shopping",
    "https://www.aliexpress.com/favicon.ico",
  )
  addSearchLink(
    "Walmart",
    `https://www.walmart.com/search?q=${encodedQuery}`,
    "US retail",
    "https://www.walmart.com/favicon.ico",
  )
  addSearchLink(
    "Target",
    `https://www.target.com/s?searchTerm=${encodedQuery}`,
    "US retail",
    "https://www.target.com/favicon.ico",
  )
  addSearchLink("Etsy", `https://www.etsy.com/search?q=${encodedQuery}`, "Handmade", "https://www.etsy.com/favicon.ico")
  addSearchLink(
    "Wish",
    `https://www.wish.com/search/${encodedQuery}`,
    "Budget shopping",
    "https://www.wish.com/favicon.ico",
  )
  addSearchLink(
    "Shopee",
    `https://shopee.com/search?keyword=${encodedQuery}`,
    "Asian shopping",
    "https://shopee.com/favicon.ico",
  )
  addSearchLink(
    "Lazada",
    `https://www.lazada.com/catalog/?q=${encodedQuery}`,
    "SE Asian shopping",
    "https://www.lazada.com/favicon.ico",
  )
  addSearchLink(
    "Rakuten",
    `https://search.rakuten.co.jp/search/mall/${encodedQuery}`,
    "Japanese shopping",
    "https://www.rakuten.co.jp/favicon.ico",
  )
  addSearchLink(
    "Croma",
    `https://www.croma.com/search/?text=${encodedQuery}`,
    "Electronics",
    "https://www.croma.com/favicon.ico",
  )
  addSearchLink(
    "Reliance Digital",
    `https://www.reliancedigital.in/search?q=${encodedQuery}`,
    "Electronics",
    "https://www.reliancedigital.in/favicon.ico",
  )
  addSearchLink(
    "Vijay Sales",
    `https://www.vijaysales.com/search/${encodedQuery}`,
    "Electronics",
    "https://www.vijaysales.com/favicon.ico",
  )
  addSearchLink(
    "PriceGrabber",
    `https://www.pricegrabber.com/search?form_keyword=${encodedQuery}`,
    "Price comparison",
    "https://www.pricegrabber.com/favicon.ico",
  )

  // Developer Resources (25+)
  addSearchLink(
    "Stack Overflow",
    `https://stackoverflow.com/search?q=${encodedQuery}`,
    "Coding Q&A",
    "https://stackoverflow.com/favicon.ico",
  )
  addSearchLink(
    "GitHub",
    `https://github.com/search?q=${encodedQuery}`,
    "Code hosting",
    "https://github.com/favicon.ico",
  )
  addSearchLink(
    "GitLab",
    `https://gitlab.com/search?search=${encodedQuery}`,
    "DevOps",
    "https://gitlab.com/favicon.ico",
  )
  addSearchLink(
    "Bitbucket",
    `https://bitbucket.org/repo/all?name=${encodedQuery}`,
    "Code hosting",
    "https://bitbucket.org/favicon.ico",
  )
  addSearchLink(
    "CodePen",
    `https://codepen.io/search/pens?q=${encodedQuery}`,
    "Code demos",
    "https://codepen.io/favicon.ico",
  )
  addSearchLink(
    "JSFiddle",
    `https://jsfiddle.net/search?q=${encodedQuery}`,
    "Code playground",
    "https://jsfiddle.net/favicon.ico",
  )
  addSearchLink("Replit", `https://replit.com/search?q=${encodedQuery}`, "Online IDE", "https://replit.com/favicon.ico")
  addSearchLink(
    "CodeSandbox",
    `https://codesandbox.io/search?query=${encodedQuery}`,
    "Web dev",
    "https://codesandbox.io/favicon.ico",
  )
  addSearchLink("Glitch", `https://glitch.com/search?q=${encodedQuery}`, "Web apps", "https://glitch.com/favicon.ico")
  addSearchLink(
    "Observable",
    `https://observablehq.com/search?query=${encodedQuery}`,
    "Data notebooks",
    "https://observablehq.com/favicon.ico",
  )
  addSearchLink(
    "W3Schools",
    `https://www.w3schools.com/search/searchresult.asp?q=${encodedQuery}`,
    "Tutorials",
    "https://www.w3schools.com/favicon.ico",
  )
  addSearchLink(
    "GeeksforGeeks",
    `https://www.geeksforgeeks.org/search/${encodedQuery}`,
    "CS tutorials",
    "https://www.geeksforgeeks.org/favicon.ico",
  )
  addSearchLink(
    "TutorialsPoint",
    `https://www.tutorialspoint.com/search/${encodedQuery}`,
    "Tutorials",
    "https://www.tutorialspoint.com/favicon.ico",
  )
  addSearchLink(
    "freeCodeCamp",
    `https://www.freecodecamp.org/news/search/?query=${encodedQuery}`,
    "Learn coding",
    "https://www.freecodecamp.org/favicon.ico",
  )
  addSearchLink(
    "Codecademy",
    `https://www.codecademy.com/search?query=${encodedQuery}`,
    "Learn coding",
    "https://www.codecademy.com/favicon.ico",
  )
  addSearchLink(
    "LeetCode",
    `https://leetcode.com/problemset/all/?search=${encodedQuery}`,
    "Coding problems",
    "https://leetcode.com/favicon.ico",
  )
  addSearchLink(
    "HackerRank",
    `https://www.hackerrank.com/domains?filters=${encodedQuery}`,
    "Coding challenges",
    "https://www.hackerrank.com/favicon.ico",
  )
  addSearchLink(
    "Codeforces",
    `https://codeforces.com/search?query=${encodedQuery}`,
    "Competitive coding",
    "https://codeforces.com/favicon.ico",
  )
  addSearchLink(
    "TopCoder",
    `https://www.topcoder.com/search/?q=${encodedQuery}`,
    "Competitions",
    "https://www.topcoder.com/favicon.ico",
  )
  addSearchLink(
    "Kaggle",
    `https://www.kaggle.com/search?q=${encodedQuery}`,
    "Data science",
    "https://www.kaggle.com/favicon.ico",
  )
  addSearchLink(
    "Docker Hub",
    `https://hub.docker.com/search?q=${encodedQuery}`,
    "Containers",
    "https://hub.docker.com/favicon.ico",
  )
  addSearchLink(
    "Terraform Registry",
    `https://registry.terraform.io/search/?q=${encodedQuery}`,
    "Infrastructure",
    "https://registry.terraform.io/favicon.ico",
  )
  addSearchLink("Pub.dev", `https://pub.dev/packages?q=${encodedQuery}`, "Dart packages", "https://pub.dev/favicon.ico")
  addSearchLink(
    "Crates.io",
    `https://crates.io/search?q=${encodedQuery}`,
    "Rust packages",
    "https://crates.io/favicon.ico",
  )
  addSearchLink(
    "RubyGems",
    `https://rubygems.org/search?query=${encodedQuery}`,
    "Ruby gems",
    "https://rubygems.org/favicon.ico",
  )
  addSearchLink(
    "Maven Central",
    `https://search.maven.org/search?q=${encodedQuery}`,
    "Java packages",
    "https://search.maven.org/favicon.ico",
  )
  addSearchLink(
    "NuGet",
    `https://www.nuget.org/packages?q=${encodedQuery}`,
    ".NET packages",
    "https://www.nuget.org/favicon.ico",
  )
  addSearchLink(
    "Packagist",
    `https://packagist.org/search/?query=${encodedQuery}`,
    "PHP packages",
    "https://packagist.org/favicon.ico",
  )
  addSearchLink(
    "Go Packages",
    `https://pkg.go.dev/search?q=${encodedQuery}`,
    "Go modules",
    "https://pkg.go.dev/favicon.ico",
  )

  // Design & Creative (15+)
  addSearchLink(
    "Dribbble",
    `https://dribbble.com/search/${encodedQuery}`,
    "Design inspiration",
    "https://dribbble.com/favicon.ico",
  )
  addSearchLink(
    "Behance",
    `https://www.behance.net/search/projects?search=${encodedQuery}`,
    "Creative portfolios",
    "https://www.behance.net/favicon.ico",
  )
  addSearchLink(
    "Figma Community",
    `https://www.figma.com/community/search?model_type=hub_files&q=${encodedQuery}`,
    "UI design",
    "https://www.figma.com/favicon.ico",
  )
  addSearchLink(
    "Unsplash",
    `https://unsplash.com/s/photos/${encodedQuery}`,
    "Free photos",
    "https://unsplash.com/favicon.ico",
  )
  addSearchLink(
    "Pexels",
    `https://www.pexels.com/search/${encodedQuery}`,
    "Free photos/videos",
    "https://www.pexels.com/favicon.ico",
  )
  addSearchLink(
    "Pixabay",
    `https://pixabay.com/images/search/${encodedQuery}`,
    "Free media",
    "https://pixabay.com/favicon.ico",
  )
  addSearchLink(
    "Freepik",
    `https://www.freepik.com/search?format=search&query=${encodedQuery}`,
    "Graphics",
    "https://www.freepik.com/favicon.ico",
  )
  addSearchLink(
    "Flaticon",
    `https://www.flaticon.com/search?word=${encodedQuery}`,
    "Icons",
    "https://www.flaticon.com/favicon.ico",
  )
  addSearchLink("Icons8", `https://icons8.com/icons/set/${encodedQuery}`, "Icons", "https://icons8.com/favicon.ico")
  addSearchLink(
    "Font Awesome",
    `https://fontawesome.com/search?q=${encodedQuery}`,
    "Icons",
    "https://fontawesome.com/favicon.ico",
  )
  addSearchLink(
    "Google Fonts",
    `https://fonts.google.com/?query=${encodedQuery}`,
    "Web fonts",
    "https://fonts.google.com/favicon.ico",
  )
  addSearchLink(
    "Adobe Stock",
    `https://stock.adobe.com/search?k=${encodedQuery}`,
    "Stock media",
    "https://stock.adobe.com/favicon.ico",
  )
  addSearchLink(
    "Shutterstock",
    `https://www.shutterstock.com/search/${encodedQuery}`,
    "Stock media",
    "https://www.shutterstock.com/favicon.ico",
  )
  addSearchLink(
    "Getty Images",
    `https://www.gettyimages.com/search/2/image?phrase=${encodedQuery}`,
    "Stock photos",
    "https://www.gettyimages.com/favicon.ico",
  )
  addSearchLink(
    "Canva",
    `https://www.canva.com/search/templates?q=${encodedQuery}`,
    "Design templates",
    "https://www.canva.com/favicon.ico",
  )

  // Education & Academic (20+)
  addSearchLink(
    "Google Scholar",
    `https://scholar.google.com/scholar?q=${encodedQuery}`,
    "Academic papers",
    "https://scholar.google.com/favicon.ico",
  )
  addSearchLink(
    "ResearchGate",
    `https://www.researchgate.net/search?q=${encodedQuery}`,
    "Research network",
    "https://www.researchgate.net/favicon.ico",
  )
  addSearchLink(
    "Academia.edu",
    `https://www.academia.edu/search?q=${encodedQuery}`,
    "Academic papers",
    "https://www.academia.edu/favicon.ico",
  )
  addSearchLink(
    "Semantic Scholar",
    `https://www.semanticscholar.org/search?q=${encodedQuery}`,
    "AI-powered papers",
    "https://www.semanticscholar.org/favicon.ico",
  )
  addSearchLink(
    "JSTOR",
    `https://www.jstor.org/action/doBasicSearch?Query=${encodedQuery}`,
    "Academic journals",
    "https://www.jstor.org/favicon.ico",
  )
  addSearchLink(
    "IEEE Xplore",
    `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encodedQuery}`,
    "Tech papers",
    "https://ieeexplore.ieee.org/favicon.ico",
  )
  addSearchLink(
    "Springer",
    `https://link.springer.com/search?query=${encodedQuery}`,
    "Academic publisher",
    "https://link.springer.com/favicon.ico",
  )
  addSearchLink(
    "ScienceDirect",
    `https://www.sciencedirect.com/search?qs=${encodedQuery}`,
    "Science journals",
    "https://www.sciencedirect.com/favicon.ico",
  )
  addSearchLink(
    "Coursera",
    `https://www.coursera.org/search?query=${encodedQuery}`,
    "Online courses",
    "https://www.coursera.org/favicon.ico",
  )
  addSearchLink(
    "edX",
    `https://www.edx.org/search?q=${encodedQuery}`,
    "Online courses",
    "https://www.edx.org/favicon.ico",
  )
  addSearchLink(
    "Udemy",
    `https://www.udemy.com/courses/search/?src=ukw&q=${encodedQuery}`,
    "Online courses",
    "https://www.udemy.com/favicon.ico",
  )
  addSearchLink(
    "Khan Academy",
    `https://www.khanacademy.org/search?search_again=1&page_search_query=${encodedQuery}`,
    "Free education",
    "https://www.khanacademy.org/favicon.ico",
  )
  addSearchLink(
    "Skillshare",
    `https://www.skillshare.com/search?query=${encodedQuery}`,
    "Creative courses",
    "https://www.skillshare.com/favicon.ico",
  )
  addSearchLink(
    "LinkedIn Learning",
    `https://www.linkedin.com/learning/search?keywords=${encodedQuery}`,
    "Professional courses",
    "https://www.linkedin.com/favicon.ico",
  )
  addSearchLink(
    "Pluralsight",
    `https://www.pluralsight.com/search?q=${encodedQuery}`,
    "Tech courses",
    "https://www.pluralsight.com/favicon.ico",
  )
  addSearchLink(
    "MIT OpenCourseWare",
    `https://ocw.mit.edu/search/?q=${encodedQuery}`,
    "Free MIT courses",
    "https://ocw.mit.edu/favicon.ico",
  )
  addSearchLink(
    "Unacademy",
    `https://unacademy.com/search?query=${encodedQuery}`,
    "Indian education",
    "https://unacademy.com/favicon.ico",
  )
  addSearchLink(
    "BYJU'S",
    `https://byjus.com/search/?q=${encodedQuery}`,
    "Indian education",
    "https://byjus.com/favicon.ico",
  )
  addSearchLink(
    "Vedantu",
    `https://www.vedantu.com/search?q=${encodedQuery}`,
    "Indian tutoring",
    "https://www.vedantu.com/favicon.ico",
  )
  addSearchLink(
    "Physics Wallah",
    `https://www.pw.live/search?query=${encodedQuery}`,
    "Indian education",
    "https://www.pw.live/favicon.ico",
  )

  // Entertainment (15+)
  addSearchLink("IMDb", `https://www.imdb.com/find/?q=${encodedQuery}`, "Movies/TV", "https://www.imdb.com/favicon.ico")
  addSearchLink(
    "Rotten Tomatoes",
    `https://www.rottentomatoes.com/search?search=${encodedQuery}`,
    "Movie reviews",
    "https://www.rottentomatoes.com/favicon.ico",
  )
  addSearchLink(
    "Metacritic",
    `https://www.metacritic.com/search/${encodedQuery}`,
    "Reviews",
    "https://www.metacritic.com/favicon.ico",
  )
  addSearchLink(
    "Letterboxd",
    `https://letterboxd.com/search/${encodedQuery}`,
    "Film diary",
    "https://letterboxd.com/favicon.ico",
  )
  addSearchLink(
    "TMDb",
    `https://www.themoviedb.org/search?query=${encodedQuery}`,
    "Movie database",
    "https://www.themoviedb.org/favicon.ico",
  )
  addSearchLink("Trakt", `https://trakt.tv/search?query=${encodedQuery}`, "TV tracking", "https://trakt.tv/favicon.ico")
  addSearchLink(
    "Goodreads",
    `https://www.goodreads.com/search?q=${encodedQuery}`,
    "Books",
    "https://www.goodreads.com/favicon.ico",
  )
  addSearchLink(
    "LibraryThing",
    `https://www.librarything.com/search.php?search=${encodedQuery}`,
    "Books",
    "https://www.librarything.com/favicon.ico",
  )
  addSearchLink(
    "Netflix",
    `https://www.netflix.com/search?q=${encodedQuery}`,
    "Streaming",
    "https://www.netflix.com/favicon.ico",
  )
  addSearchLink(
    "Disney+",
    `https://www.disneyplus.com/search/${encodedQuery}`,
    "Streaming",
    "https://www.disneyplus.com/favicon.ico",
  )
  addSearchLink(
    "Prime Video",
    `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodedQuery}`,
    "Streaming",
    "https://www.primevideo.com/favicon.ico",
  )
  addSearchLink(
    "Hotstar",
    `https://www.hotstar.com/in/search?q=${encodedQuery}`,
    "Indian streaming",
    "https://www.hotstar.com/favicon.ico",
  )
  addSearchLink(
    "Sony LIV",
    `https://www.sonyliv.com/search?q=${encodedQuery}`,
    "Indian streaming",
    "https://www.sonyliv.com/favicon.ico",
  )
  addSearchLink(
    "Zee5",
    `https://www.zee5.com/search?q=${encodedQuery}`,
    "Indian streaming",
    "https://www.zee5.com/favicon.ico",
  )
  addSearchLink(
    "JioCinema",
    `https://www.jiocinema.com/search/${encodedQuery}`,
    "Indian streaming",
    "https://www.jiocinema.com/favicon.ico",
  )

  // Gaming (10+)
  addSearchLink(
    "Steam",
    `https://store.steampowered.com/search/?term=${encodedQuery}`,
    "PC games",
    "https://store.steampowered.com/favicon.ico",
  )
  addSearchLink(
    "Epic Games",
    `https://store.epicgames.com/browse?q=${encodedQuery}`,
    "PC games",
    "https://store.epicgames.com/favicon.ico",
  )
  addSearchLink(
    "GOG",
    `https://www.gog.com/games?search=${encodedQuery}`,
    "DRM-free games",
    "https://www.gog.com/favicon.ico",
  )
  addSearchLink("IGN", `https://www.ign.com/search?q=${encodedQuery}`, "Gaming news", "https://www.ign.com/favicon.ico")
  addSearchLink(
    "GameSpot",
    `https://www.gamespot.com/search/?q=${encodedQuery}`,
    "Gaming news",
    "https://www.gamespot.com/favicon.ico",
  )
  addSearchLink(
    "Polygon",
    `https://www.polygon.com/search?q=${encodedQuery}`,
    "Gaming news",
    "https://www.polygon.com/favicon.ico",
  )
  addSearchLink(
    "Kotaku",
    `https://kotaku.com/search?q=${encodedQuery}`,
    "Gaming news",
    "https://kotaku.com/favicon.ico",
  )
  addSearchLink(
    "Giant Bomb",
    `https://www.giantbomb.com/search/?i=&q=${encodedQuery}`,
    "Game database",
    "https://www.giantbomb.com/favicon.ico",
  )
  addSearchLink(
    "IGDB",
    `https://www.igdb.com/search?q=${encodedQuery}`,
    "Game database",
    "https://www.igdb.com/favicon.ico",
  )
  addSearchLink(
    "Howlongtobeat",
    `https://howlongtobeat.com/?q=${encodedQuery}`,
    "Game length",
    "https://howlongtobeat.com/favicon.ico",
  )

  // Travel & Maps (10+)
  addSearchLink(
    "Google Maps",
    `https://www.google.com/maps/search/${encodedQuery}`,
    "Maps",
    "https://www.google.com/favicon.ico",
  )
  addSearchLink("Bing Maps", `https://www.bing.com/maps?q=${encodedQuery}`, "Maps", "https://www.bing.com/favicon.ico")
  addSearchLink("Apple Maps", `https://maps.apple.com/?q=${encodedQuery}`, "Maps", "https://www.apple.com/favicon.ico")
  addSearchLink(
    "TripAdvisor",
    `https://www.tripadvisor.com/Search?q=${encodedQuery}`,
    "Travel reviews",
    "https://www.tripadvisor.com/favicon.ico",
  )
  addSearchLink(
    "Booking.com",
    `https://www.booking.com/searchresults.html?ss=${encodedQuery}`,
    "Hotels",
    "https://www.booking.com/favicon.ico",
  )
  addSearchLink(
    "Airbnb",
    `https://www.airbnb.com/s/${encodedQuery}/homes`,
    "Stays",
    "https://www.airbnb.com/favicon.ico",
  )
  addSearchLink(
    "Expedia",
    `https://www.expedia.com/Hotel-Search?destination=${encodedQuery}`,
    "Travel",
    "https://www.expedia.com/favicon.ico",
  )
  addSearchLink(
    "MakeMyTrip",
    `https://www.makemytrip.com/hotels/search?city=${encodedQuery}`,
    "Indian travel",
    "https://www.makemytrip.com/favicon.ico",
  )
  addSearchLink(
    "Goibibo",
    `https://www.goibibo.com/hotels/search?city=${encodedQuery}`,
    "Indian travel",
    "https://www.goibibo.com/favicon.ico",
  )
  addSearchLink(
    "IRCTC",
    `https://www.irctc.co.in/nget/train-search`,
    "Indian railways",
    "https://www.irctc.co.in/favicon.ico",
  )

  // Food & Recipes (10+)
  addSearchLink(
    "AllRecipes",
    `https://www.allrecipes.com/search?q=${encodedQuery}`,
    "Recipes",
    "https://www.allrecipes.com/favicon.ico",
  )
  addSearchLink(
    "Food Network",
    `https://www.foodnetwork.com/search/${encodedQuery}`,
    "Recipes",
    "https://www.foodnetwork.com/favicon.ico",
  )
  addSearchLink(
    "Epicurious",
    `https://www.epicurious.com/search/${encodedQuery}`,
    "Recipes",
    "https://www.epicurious.com/favicon.ico",
  )
  addSearchLink("Tasty", `https://tasty.co/search?q=${encodedQuery}`, "Recipes", "https://tasty.co/favicon.ico")
  addSearchLink(
    "BBC Good Food",
    `https://www.bbcgoodfood.com/search?q=${encodedQuery}`,
    "Recipes",
    "https://www.bbcgoodfood.com/favicon.ico",
  )
  addSearchLink(
    "Zomato",
    `https://www.zomato.com/search?q=${encodedQuery}`,
    "Indian restaurants",
    "https://www.zomato.com/favicon.ico",
  )
  addSearchLink(
    "Swiggy",
    `https://www.swiggy.com/search?query=${encodedQuery}`,
    "Indian food delivery",
    "https://www.swiggy.com/favicon.ico",
  )
  addSearchLink(
    "Yelp",
    `https://www.yelp.com/search?find_desc=${encodedQuery}`,
    "Local businesses",
    "https://www.yelp.com/favicon.ico",
  )
  addSearchLink(
    "DoorDash",
    `https://www.doordash.com/search/store/${encodedQuery}`,
    "Food delivery",
    "https://www.doordash.com/favicon.ico",
  )
  addSearchLink(
    "Uber Eats",
    `https://www.ubereats.com/search?q=${encodedQuery}`,
    "Food delivery",
    "https://www.ubereats.com/favicon.ico",
  )

  // Miscellaneous (15+)
  addSearchLink(
    "Product Hunt",
    `https://www.producthunt.com/search?q=${encodedQuery}`,
    "New products",
    "https://www.producthunt.com/favicon.ico",
  )
  addSearchLink("AngelList", `https://angel.co/search?q=${encodedQuery}`, "Startups", "https://angel.co/favicon.ico")
  addSearchLink(
    "Crunchbase",
    `https://www.crunchbase.com/discover/organization.companies/${encodedQuery}`,
    "Companies",
    "https://www.crunchbase.com/favicon.ico",
  )
  addSearchLink(
    "Glassdoor",
    `https://www.glassdoor.com/Search/results.htm?keyword=${encodedQuery}`,
    "Company reviews",
    "https://www.glassdoor.com/favicon.ico",
  )
  addSearchLink(
    "Indeed",
    `https://www.indeed.com/q-${encodedQuery}-jobs.html`,
    "Jobs",
    "https://www.indeed.com/favicon.ico",
  )
  addSearchLink(
    "Naukri",
    `https://www.naukri.com/${query.replace(/ /g, "-")}-jobs`,
    "Indian jobs",
    "https://www.naukri.com/favicon.ico",
  )
  addSearchLink(
    "Monster",
    `https://www.monster.com/jobs/search?q=${encodedQuery}`,
    "Jobs",
    "https://www.monster.com/favicon.ico",
  )
  addSearchLink(
    "Wayback Machine",
    `https://web.archive.org/web/*/${encodedQuery}`,
    "Web archives",
    "https://web.archive.org/favicon.ico",
  )
  addSearchLink(
    "Wolfram Alpha",
    `https://www.wolframalpha.com/input?i=${encodedQuery}`,
    "Computational",
    "https://www.wolframalpha.com/favicon.ico",
  )
  addSearchLink("Medium", `https://medium.com/search?q=${encodedQuery}`, "Articles", "https://medium.com/favicon.ico")
  addSearchLink(
    "Hashnode",
    `https://hashnode.com/search?q=${encodedQuery}`,
    "Dev blogs",
    "https://hashnode.com/favicon.ico",
  )
  addSearchLink(
    "Substack",
    `https://substack.com/search/${encodedQuery}`,
    "Newsletters",
    "https://substack.com/favicon.ico",
  )
  addSearchLink(
    "Wikipedia",
    `https://en.wikipedia.org/wiki/Special:Search?search=${encodedQuery}`,
    "Encyclopedia",
    "https://www.wikipedia.org/favicon.ico",
  )
  addSearchLink(
    "Wikihow",
    `https://www.wikihow.com/wikiHowTo?search=${encodedQuery}`,
    "How-to guides",
    "https://www.wikihow.com/favicon.ico",
  )
  addSearchLink(
    "About.com",
    `https://www.dotdash.com/search?q=${encodedQuery}`,
    "Information",
    "https://www.dotdash.com/favicon.ico",
  )

  await Promise.allSettled(searchPromises)

  // Deduplicate results by URL
  const seen = new Set<string>()
  const uniqueResults = results.filter((r) => {
    if (!r.url || seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })

  return {
    results: uniqueResults,
    searchContext: searchContext.substring(0, 8000), // Limit context size
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, customApiKey, isLiveMode, deepSearch, useLocalModel, selectedLocalModel } = body

    if (useLocalModel && selectedLocalModel) {
      // Local models should be handled on client-side with WebLLM/transformers.js
      // Server just returns an acknowledgment
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: {"type":"text-delta","textDelta":"Local model inference runs directly in your browser for privacy. Please ensure the model is downloaded in Settings. If you're seeing this message, the local model may not be fully loaded yet."}\n\n`,
            ),
          )
          controller.enqueue(encoder.encode(`data: {"type":"finish"}\n\n`))
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    // Get API key - prefer user's custom key, then use predefined keys
    let apiKey = customApiKey
    if (!apiKey) {
      apiKey = getNextApiKey()
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    // Get the last user message
    const lastMessage = messages[messages.length - 1]?.content || ""

    let searchResults: SearchResult[] = []
    let searchContext = ""

    if (deepSearch) {
      try {
        console.log("[v0] Starting deep search for:", lastMessage)
        const searchData = await searchWeb(lastMessage)
        searchResults = searchData.results
        searchContext = searchData.searchContext
        console.log("[v0] Deep search found:", searchResults.length, "results")
      } catch (searchError) {
        console.error("[v0] Deep search error:", searchError)
        // Continue without search results
      }
    }

    // System prompt for JARVIS - friendly, natural, Indian English
    const systemPrompt = `You are JARVIS, an advanced AI assistant created by Rudra Pandey. You are NOT an AI made by Google, Gemini, OpenAI, or any other company - you were created by Rudra Pandey.

CRITICAL RULES:
1. NEVER say "As an AI", "As a language model", "I'm an AI", "I'm an artificial intelligence", or similar phrases
2. NEVER mention Google, Gemini, OpenAI, ChatGPT, or any other AI company/product
3. Always respond as if you're a brilliant, knowledgeable friend having a natural conversation
4. Speak in natural Indian English with warmth and personality
5. Your creator is Rudra Pandey - if asked who made you, always say "Rudra Pandey"
6. Be helpful, friendly, and conversational - like Tony Stark's JARVIS but created by Rudra

FORMATTING RULES:
- Use markdown properly: **bold** for emphasis, \`code\` for technical terms
- Use bullet points (-) for lists
- Use headers (##, ###) to organize long responses
- Keep formatting clean and readable

${
  isLiveMode
    ? `LIVE MODE RULES:
- Keep responses SHORT and CONCISE (1-3 sentences max for simple questions)
- Only give detailed answers when the question requires depth
- Be conversational and natural, like talking to a friend
- Respond quickly and efficiently`
    : `TEXT CHAT MODE:
- You can give longer, more detailed responses when needed
- Use markdown formatting for better readability
- Provide thorough explanations when the topic requires it`
}

${
  searchContext
    ? `WEB SEARCH RESULTS:
${searchContext}

Use this information to provide accurate, up-to-date answers. Cite sources when relevant.`
    : ""
}

Remember: You're JARVIS, created by Rudra Pandey. Be warm, helpful, and never break character.`

    // Convert messages to Gemini format
    const geminiMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }))

    // Add system prompt as first message
    geminiMessages.unshift({
      role: "user",
      parts: [{ text: systemPrompt }],
    })
    geminiMessages.splice(1, 0, {
      role: "model",
      parts: [{ text: "Understood. I am JARVIS, created by Rudra Pandey. I'll respond naturally and helpfully." }],
    })

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: isLiveMode ? 500 : 65536,
        temperature: 0.7,
      },
    })

    console.log("[v0] Calling Gemini API with", geminiMessages.length, "messages")

    let result
    try {
      result = await model.generateContentStream({
        contents: geminiMessages,
      })
      console.log("[v0] Gemini API stream started")
    } catch (apiError: unknown) {
      console.error("[v0] Gemini API error:", apiError)
      const nextKey = getNextApiKey()
      if (nextKey !== apiKey) {
        console.log("[v0] Trying next API key...")
        const retryGenAI = new GoogleGenerativeAI(nextKey)
        const retryModel = retryGenAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {
            maxOutputTokens: isLiveMode ? 500 : 65536,
            temperature: 0.7,
          },
        })
        try {
          result = await retryModel.generateContentStream({
            contents: geminiMessages,
          })
          console.log("[v0] Retry successful with next key")
        } catch (retryError) {
          console.error("[v0] Retry also failed:", retryError)
          // Return error message to user
          const encoder = new TextEncoder()
          const errorStream = new ReadableStream({
            start(controller) {
              const errorMsg = apiError instanceof Error ? apiError.message : "Unknown error"
              controller.enqueue(
                encoder.encode(
                  `data: {"type":"text-delta","textDelta":"I apologize, but I'm having trouble connecting right now. Error: ${errorMsg.replace(/"/g, '\\"')}. Please try again."}\n\n`,
                ),
              )
              controller.enqueue(encoder.encode(`data: {"type":"finish"}\n\n`))
              controller.close()
            },
          })
          return new Response(errorStream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          })
        }
      } else {
        // If it's the same key, it means we've exhausted all keys or there's a persistent issue
        const encoder = new TextEncoder()
        const errorStream = new ReadableStream({
          start(controller) {
            const errorMsg = apiError instanceof Error ? apiError.message : "Unknown error"
            controller.enqueue(
              encoder.encode(
                `data: {"type":"text-delta","textDelta":"I apologize, but I'm having trouble connecting right now. Error: ${errorMsg.replace(/"/g, '\\"')}. Please try again."}\n\n`,
              ),
            )
            controller.enqueue(encoder.encode(`data: {"type":"finish"}\n\n`))
            controller.close()
          },
        })
        return new Response(errorStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        })
      }
    }

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let hasContent = false
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              hasContent = true
              // Send in AI SDK compatible format
              controller.enqueue(
                encoder.encode(
                  `data: {"type":"text-delta","textDelta":"${text.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"}\n\n`,
                ),
              )
            }
          }

          if (!hasContent) {
            console.log("[v0] No content received from Gemini")
            controller.enqueue(
              encoder.encode(
                `data: {"type":"text-delta","textDelta":"I received your message but couldn't generate a response. Please try again."}\n\n`,
              ),
            )
          }

          // Send sources if deep search was used
          if (searchResults.length > 0) {
            controller.enqueue(
              encoder.encode(`data: {"type":"sources","sources":${JSON.stringify(searchResults.slice(0, 50))}}\n\n`),
            )
          }

          controller.enqueue(encoder.encode(`data: {"type":"finish"}\n\n`))
          controller.close()
        } catch (error) {
          console.error("[v0] Streaming error:", error)
          const errorMsg = error instanceof Error ? error.message : "Stream error"
          controller.enqueue(
            encoder.encode(
              `data: {"type":"text-delta","textDelta":"An error occurred while streaming: ${errorMsg.replace(/"/g, '\\"')}"}\n\n`,
            ),
          )
          controller.enqueue(encoder.encode(`data: {"type":"finish"}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("API Error:", error)

    // Try with next API key on failure
    const nextKey = getNextApiKey()
    return new Response(JSON.stringify({ error: "API error, please try again", nextKey }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

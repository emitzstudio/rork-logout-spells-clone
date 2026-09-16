-- 0097: Add the Europe Christmas + NYE announcement only; assets must already be live.
-- 14 days / 13 nights = 12 hotel nights + 1 proposed sleeper night. Price TBA.
-- No existing spells, ordering, forms, bookings, receipts or payments are edited.
do $$
declare
  v_id constant uuid := 'e2012026-c117-4e3d-a501-020120270001';
  v_dep_id constant uuid := 'e2012026-c117-4e3d-a501-020120270002';
  v_content constant jsonb := $europe${
  "slug": "the-europe-christmas-nye-spell",
  "name": "The Europe Christmas + NYE Spell",
  "hook": "Christmas markets. Midnight on the rails. A new year by the canals.",
  "category": "celebration",
  "status": "published",
  "urgency": "new",
  "featured": false,
  "location": "Europe · Brussels to Amsterdam",
  "region": "Europe",
  "duration_days": 14,
  "nights": 13,
  "price_minor": 0,
  "currency": "INR",
  "host_name": "",
  "host_role": "",
  "form_id": null,
  "hero_url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-brussels-winter-v1.jpg",
  "departure": {
    "date_label": "20 December 2026 - 2 January 2027",
    "start_date": "2026-12-20",
    "end_date": "2027-01-02",
    "seats_total": 0,
    "price_minor": null,
    "status": "scheduled"
  },
  "page": {
    "version": 1,
    "quickInfo": [
      {
        "id": "duration",
        "icon": "clock",
        "label": "Duration",
        "value": "14 days / 13 nights"
      },
      {
        "id": "location",
        "icon": "map-pin",
        "label": "Route",
        "value": "Brussels to Amsterdam · 5 countries"
      },
      {
        "id": "highlight",
        "icon": "moon",
        "label": "New Year's Eve",
        "value": "A proposed night on European Sleeper"
      },
      {
        "id": "vibe",
        "icon": "sparkles",
        "label": "The atmosphere",
        "value": "Christmas markets & winter city lights"
      },
      {
        "id": "perfectFor",
        "icon": "compass",
        "label": "Travel dates",
        "value": "20 December 2026 - 2 January 2027"
      }
    ],
    "about": {
      "heading": "A little Christmas magic. A whole new year.",
      "body": "Follow the festive lights across five European countries, from Brussels and a Bruges day trip to Christmas Eve in Strasbourg and Christmas Day in Colmar. A Paris interlude leads to Berlin and Prague, before a proposed New Year's Eve sleeper journey and a gentle New Year's Day in Amsterdam. Delhi to Brussels at the start, Amsterdam to Delhi at the finish.\n\n14 days / 13 nights: 12 hotel nights plus 1 overnight sleeper-train night. The count covers arrival in Brussels on 20 December through departure from Amsterdam on 2 January.\n\n**THE ROUTE**\n**Delhi to Brussels**\nOutbound flight · arrive 20 December\n\n**Brussels · 3 nights**\n20-23 December · Bruges day trip on 22 December\n\n**Strasbourg · 3 nights**\n23-26 December · Colmar day trip on 25 December\n\n**Paris · 1 night**\n26-27 December · direct TGV from Strasbourg\n\n**Berlin · 2 nights**\n27-29 December · flight from Paris\n\n**Prague · 2 nights**\n29-31 December · direct train from Berlin\n\n**European Sleeper · 1 night**\n31 December-1 January · proposed Prague to Amsterdam\n\n**Amsterdam · 1 night**\n1-2 January · return flight to Delhi on 2 January\n\nAI-generated destination-inspired artwork illustrates the atmosphere; it is not photography of confirmed hotels, booked events or guaranteed weather.",
      "quote": "Christmas markets. Midnight on the rails. A new year by the canals.",
      "image": null,
      "layout": "full"
    },
    "host": {
      "name": "",
      "title": "",
      "instagram": "",
      "about": "",
      "quote": "",
      "tags": [],
      "image": null
    },
    "stay": {
      "name": "Twelve hotel nights. One moving chapter.",
      "shortDescription": "Brussels 3N · Strasbourg 3N · Paris 1N · Berlin 2N · Prague 2N · Sleeper 1N · Amsterdam 1N",
      "longDescription": "**BRUSSELS · 3 NIGHTS**\n20-23 Dec 2026 · Hotel to be confirmed\n\n**STRASBOURG · 3 NIGHTS**\n23-26 Dec 2026 · Hotel to be confirmed\n\n**PARIS · 1 NIGHT**\n26-27 Dec 2026 · Hotel to be confirmed\n\n**BERLIN · 2 NIGHTS**\n27-29 Dec 2026 · Hotel to be confirmed\n\n**PRAGUE · 2 NIGHTS**\n29-31 Dec 2026 · Hotel to be confirmed\n\n**EUROPEAN SLEEPER · 1 NIGHT**\n31 Dec 2026-1 Jan 2027 · Proposed overnight European Sleeper\n\n**AMSTERDAM · 1 NIGHT**\n1-2 Jan 2027 · Hotel to be confirmed\n\n14 days / 13 nights: 12 hotel nights plus 1 overnight sleeper-train night. The count covers arrival in Brussels on 20 December through departure from Amsterdam on 2 January.\n\nHotel names, categories, room sharing and sleeper accommodation are to be confirmed. The overnight train on 31 December is proposed, subject to the operator's holiday timetable and availability.",
      "amenities": [],
      "highlights": [],
      "rating": 0,
      "mapLabel": "Europe · Brussels to Amsterdam",
      "images": []
    },
    "itinerary": [
      {
        "id": "europe-day-1",
        "title": "Arrival in Brussels",
        "locationTag": "Delhi to Brussels",
        "subtitle": "Day 1 · 20 December 2026",
        "isCustom": false,
        "body": "A winter arrival, a hotel check-in, and the first evening under Brussels' Christmas lights.\n\n**01 · DELHI TO BRUSSELS**\nArrive in Brussels and check into the hotel.\n\n**02 · GRAND-PLACE**\nExplore the square and take in the Brussels Christmas lights.\n\n**03 · WINTER WONDERS**\nVisit the Winter Wonders Christmas Market in the evening.\n\n**04 · DINNER IN THE CITY**\nSettle into the festive atmosphere over dinner in Brussels.\n\n**GOOD TO KNOW**\nFlight and hotel details are to be confirmed; allow for arrival formalities before evening plans.",
        "image": {
          "id": "europe-brussels-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-brussels-winter-v1.jpg",
          "name": "europe brussels winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-1",
            "emoji": "",
            "text": "Overnight: Brussels"
          }
        ]
      },
      {
        "id": "europe-day-2",
        "title": "A full day in Brussels",
        "locationTag": "Brussels",
        "subtitle": "Day 2 · 21 December 2026",
        "isCustom": false,
        "body": "A relaxed full day through the city's grand squares, galleries and festive Old Town.\n\n**01 · THE HISTORIC HEART**\nExplore Grand-Place and Galeries Royales Saint-Hubert.\n\n**02 · CITY LANDMARKS**\nContinue to Mont des Arts and Manneken Pis.\n\n**03 · OLD TOWN WANDERING**\nTake your time exploring Brussels Old Town.\n\n**04 · MARKETS AFTER DARK**\nReturn to Winter Wonders Christmas Market, then enjoy the Christmas lights and an evening stroll.",
        "image": {
          "id": "europe-brussels-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-brussels-winter-v1.jpg",
          "name": "europe brussels winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-2",
            "emoji": "",
            "text": "Overnight: Brussels"
          }
        ]
      },
      {
        "id": "europe-day-3",
        "title": "Bruges day trip",
        "locationTag": "Brussels - Bruges - Brussels",
        "subtitle": "Day 3 · 22 December 2026",
        "isCustom": false,
        "body": "Medieval streets, canal-side views and a full day of festive Bruges, without changing hotels.\n\n**01 · THE MORNING TRAIN**\nTake a direct train from Brussels to Bruges, about 1 hour. Leave large luggage at the Brussels hotel and carry only a day bag.\n\n**02 · MEDIEVAL BRUGES**\nExplore Markt Square, the Belfry of Bruges, Burg Square, Rozenhoedkaai and the Historic Old Town.\n\n**03 · CHRISTMAS & WINTER GLOW**\nEnjoy the Christmas markets, Winter Glow, Christmas lights and winter bars.\n\n**04 · ILLUMINATED STREETS**\nStroll through the illuminated medieval streets, then return to Brussels by train in the evening.\n\n**GOOD TO KNOW**\nConfirm Winter Glow opening times and return trains for the date.",
        "image": {
          "id": "europe-bruges-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-bruges-winter-v1.jpg",
          "name": "europe bruges winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-3",
            "emoji": "",
            "text": "Overnight: Brussels"
          }
        ]
      },
      {
        "id": "europe-day-4",
        "title": "Brussels to Strasbourg",
        "locationTag": "Brussels to Strasbourg",
        "subtitle": "Day 4 · 23 December 2026",
        "isCustom": false,
        "body": "A daytime train to Alsace and a first evening in Strasbourg's Christmas atmosphere.\n\n**01 · CHECK OUT & TRAVEL**\nCheck out of Brussels. Travel from Brussels-Midi to Strasbourg on a planned direct daytime TGV; fastest journeys are about 3h48.\n\n**02 · ARRIVE IN ALSACE**\nArrive in Strasbourg and check into the hotel.\n\n**03 · CATHEDRAL & OLD TOWN**\nExplore Strasbourg Cathedral, Place Kléber and Petite France in the evening.\n\n**04 · FIRST CHRISTMAS MARKETS**\nEnjoy the Christmas lights and a first evening at Strasbourg's Christmas markets.\n\n**GOOD TO KNOW**\nThe direct service and exact travel time must be reconfirmed for 23 December.",
        "image": {
          "id": "europe-strasbourg-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-strasbourg-winter-v1.jpg",
          "name": "europe strasbourg winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-4",
            "emoji": "",
            "text": "Overnight: Strasbourg"
          }
        ]
      },
      {
        "id": "europe-day-5",
        "title": "Christmas Eve in Strasbourg",
        "locationTag": "Strasbourg",
        "subtitle": "Day 5 · 24 December 2026",
        "isCustom": false,
        "body": "Make the most of the markets during the day, with a beautifully lit historic centre around dusk.\n\n**01 · THE CHRISTMAS SQUARES**\nVisit Strasbourg Cathedral, Place de la Cathédrale, Place Kléber, Place Broglie and Petite France.\n\n**02 · MARKETS, FOOD & GIFTS**\nEnjoy the Christmas markets, Alsatian food, Christmas shopping, decorations and lights through the day.\n\n**03 · LATE-AFTERNOON MAGIC**\nPlan the main market experience before the anticipated 6 PM Christmas Eve closure. Stay until late afternoon, then see the illuminated centre around dusk.\n\n**04 · CHRISTMAS EVE DINNER**\nEnd the day with Christmas Eve dinner in Strasbourg.\n\n**GOOD TO KNOW**\nThe 6 PM closing time on 24 December is a planning assumption pending the official 2026 schedule. City illuminations typically continue beyond Christmas.",
        "image": {
          "id": "europe-strasbourg-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-strasbourg-winter-v1.jpg",
          "name": "europe strasbourg winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-5",
            "emoji": "",
            "text": "Overnight: Strasbourg"
          }
        ]
      },
      {
        "id": "europe-day-6",
        "title": "Christmas Day in Colmar",
        "locationTag": "Strasbourg - Colmar - Strasbourg",
        "subtitle": "Day 6 · 25 December 2026",
        "isCustom": false,
        "body": "Spend Christmas Day among half-timbered houses and the festive streets of Colmar.\n\n**01 · A SHORT TRAIN RIDE**\nTake a direct morning train from Strasbourg to Colmar, about 30 minutes.\n\n**02 · OLD TOWN & PETITE VENISE**\nExplore Petite Venise, Colmar Old Town, Quai de la Poissonnerie, Place de l'Ancienne Douane and Koïfhus.\n\n**03 · ALSATIAN CHRISTMAS**\nEnjoy Christmas markets, Alsatian Christmas decorations, cafés, restaurants and the festive Old Town atmosphere.\n\n**04 · BACK TO STRASBOURG**\nReturn to Strasbourg by direct train in the evening, about 30 minutes.\n\n**GOOD TO KNOW**\nColmar's published 2026 market schedule runs through 29 December, with Christmas Day hours of 10 AM-8 PM. Recheck before travel; individual venues may differ.",
        "image": {
          "id": "europe-colmar-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-colmar-winter-v1.jpg",
          "name": "europe colmar winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-6",
            "emoji": "",
            "text": "Overnight: Strasbourg"
          }
        ]
      },
      {
        "id": "europe-day-7",
        "title": "Strasbourg to Paris",
        "locationTag": "Strasbourg to Paris",
        "subtitle": "Day 7 · 26 December 2026",
        "isCustom": false,
        "body": "Trade Alsatian lanes for the Seine, the Eiffel Tower and an evening of Paris lights.\n\n**01 · DIRECT TO PARIS**\nCheck out of Strasbourg and take a direct TGV to Paris Gare de l'Est. Fastest services take about 1h45-2h, with no change required.\n\n**02 · THE EIFFEL TOWER**\nArrive in Paris and spend the evening around the Eiffel Tower.\n\n**03 · CHRISTMAS IN THE CITY**\nSee the Paris Christmas lights and Champs-Élysées.\n\n**04 · DINNER & AN EVENING WALK**\nFinish with dinner and an evening walk through Paris.",
        "image": {
          "id": "europe-paris-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-paris-winter-v1.jpg",
          "name": "europe paris winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-7",
            "emoji": "",
            "text": "Overnight: Paris"
          }
        ]
      },
      {
        "id": "europe-day-8",
        "title": "Paris to Berlin",
        "locationTag": "Paris to Berlin",
        "subtitle": "Day 8 · 27 December 2026",
        "isCustom": false,
        "body": "One more Paris morning before a flight keeps the next chapter moving.\n\n**01 · A MORNING IN PARIS**\nSpend the morning exploring Paris.\n\n**02 · FLY TO BERLIN**\nTake an afternoon or evening flight from Paris to Berlin, avoiding the much longer train journey.\n\n**03 · ARRIVE & CHECK IN**\nArrive in Berlin and check into the hotel.\n\n**GOOD TO KNOW**\nFlight timing, airport and baggage allowance are to be confirmed.",
        "image": {
          "id": "europe-berlin-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-berlin-winter-v1.jpg",
          "name": "europe berlin winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-8",
            "emoji": "",
            "text": "Overnight: Berlin"
          }
        ]
      },
      {
        "id": "europe-day-9",
        "title": "A full day in Berlin",
        "locationTag": "Berlin",
        "subtitle": "Day 9 · 28 December 2026",
        "isCustom": false,
        "body": "A full day of city landmarks, neighbourhoods and Berlin's winter nightlife.\n\n**01 · THE CITY ICONS**\nExplore Brandenburg Gate and the Reichstag.\n\n**02 · CULTURE & THE RIVER**\nContinue to Museum Island, Berlin Cathedral and the East Side Gallery.\n\n**03 · CHARLOTTENBURG & MARKETS**\nExplore Charlottenburg and winter / Christmas markets operating after Christmas.\n\n**04 · BERLIN NIGHTLIFE**\nExperience Berlin nightlife in the evening.\n\n**GOOD TO KNOW**\nMarket opening dates and attraction reservations need checking. Listing a landmark does not confirm an interior visit or admission ticket.",
        "image": {
          "id": "europe-berlin-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-berlin-winter-v1.jpg",
          "name": "europe berlin winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-9",
            "emoji": "",
            "text": "Overnight: Berlin"
          }
        ]
      },
      {
        "id": "europe-day-10",
        "title": "Berlin to Prague",
        "locationTag": "Berlin to Prague",
        "subtitle": "Day 10 · 29 December 2026",
        "isCustom": false,
        "body": "A scenic railway chapter through the Elbe Valley, followed by Prague's evening lights.\n\n**01 · THE DIRECT TRAIN**\nTravel from Berlin Hbf to Praha hlavní nádraží on a direct EuroCity / ComfortJet service, approximately 4h-4h20.\n\n**02 · THE ELBE VALLEY**\nEnjoy the scenic journey through the Elbe Valley.\n\n**03 · OLD TOWN & CHARLES BRIDGE**\nSpend the evening at Old Town Square and Charles Bridge.\n\n**04 · PRAGUE BY NIGHT**\nTake in the Christmas lights and enjoy dinner.\n\n**GOOD TO KNOW**\nExact service, duration and seat reservations are to be confirmed.",
        "image": {
          "id": "europe-prague-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-prague-winter-v1.jpg",
          "name": "europe prague winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-10",
            "emoji": "",
            "text": "Overnight: Prague"
          }
        ]
      },
      {
        "id": "europe-day-11",
        "title": "A full day in Prague",
        "locationTag": "Prague",
        "subtitle": "Day 11 · 30 December 2026",
        "isCustom": false,
        "body": "A full day between castle views, the river and a festive Old Town.\n\n**01 · OLD TOWN & THE BRIDGE**\nExplore Old Town Square and Charles Bridge.\n\n**02 · THE CASTLE QUARTER**\nVisit Prague Castle, St. Vitus Cathedral and Malá Strana.\n\n**03 · SQUARES & CHRISTMAS MARKETS**\nContinue to Wenceslas Square and the Christmas markets.\n\n**04 · AN OLD TOWN EVENING**\nEnjoy an evening walk through Old Town.\n\n**GOOD TO KNOW**\nPrague's major Christmas markets usually continue into January. Confirm the official 2026-27 dates and opening hours before travel.",
        "image": {
          "id": "europe-prague-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-prague-winter-v1.jpg",
          "name": "europe prague winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-11",
            "emoji": "",
            "text": "Overnight: Prague"
          }
        ]
      },
      {
        "id": "europe-day-12",
        "title": "NYE on the European Sleeper",
        "locationTag": "Prague to Amsterdam",
        "subtitle": "Day 12 · 31 December 2026",
        "isCustom": false,
        "body": "A relaxed Prague day, then a proposed New Year's Eve spent travelling through the night.\n\n**01 · ONE LAST PRAGUE DAY**\nEnjoy a relaxed morning and afternoon in Prague.\n\n**02 · BOARD EUROPEAN SLEEPER**\nIn the evening, board the proposed European Sleeper from Prague to Amsterdam.\n\n**03 · SLEEP ON THE TRAIN**\nAn overnight journey of approximately 13 hours, with arrival in Amsterdam the following morning.\n\n**GOOD TO KNOW**\nThe 31 December service, sleeper accommodation and arrival station are subject to operator confirmation. NYE is on the train; no onboard celebration or Amsterdam NYE party is included by this plan.",
        "image": {
          "id": "europe-prague-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-prague-winter-v1.jpg",
          "name": "europe prague winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-12",
            "emoji": "",
            "text": "Overnight: European Sleeper"
          }
        ]
      },
      {
        "id": "europe-day-13",
        "title": "New Year's Day in Amsterdam",
        "locationTag": "Amsterdam",
        "subtitle": "Day 13 · 1 January 2027",
        "isCustom": false,
        "body": "Arrive in the morning and ease into the new year by the canals.\n\n**01 · A MORNING ARRIVAL**\nArrive in Amsterdam from the overnight train.\n\n**02 · CANALS & NEIGHBOURHOODS**\nExplore the Amsterdam canals, Jordaan, Nine Streets and Dam Square.\n\n**03 · CAFÉS, SHOPS & LIGHTS**\nEnjoy café hopping, shopping where open, and the Amsterdam Light Festival, subject to its schedule.\n\n**04 · A RELAXED EVENING**\nUnwind over a relaxed dinner and evening in Amsterdam after New Year's Eve.\n\n**GOOD TO KNOW**\nNew Year's Day opening hours vary. Hotel check-in timing and any Light Festival tickets or route are to be confirmed.",
        "image": {
          "id": "europe-amsterdam-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-amsterdam-winter-v1.jpg",
          "name": "europe amsterdam winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-13",
            "emoji": "",
            "text": "Overnight: Amsterdam"
          }
        ]
      },
      {
        "id": "europe-day-14",
        "title": "Amsterdam departure",
        "locationTag": "Amsterdam to Delhi",
        "subtitle": "Day 14 · 2 January 2027",
        "isCustom": false,
        "body": "A relaxed final morning, then the journey home from Amsterdam to Delhi.\n\n**01 · A SLOW MORNING**\nEnjoy a relaxed morning in Amsterdam.\n\n**02 · AMSTERDAM TO DELHI**\nDepart Amsterdam for Delhi. End of the Europe Christmas + NYE journey.\n\n**GOOD TO KNOW**\nThe return flight departs on 2 January; arrival in Delhi depends on the confirmed flight schedule.\n\n**END OF THE SPELL**",
        "image": {
          "id": "europe-amsterdam-winter-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-amsterdam-winter-v1.jpg",
          "name": "europe amsterdam winter · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "europe-night-14",
            "emoji": "",
            "text": "Departure day · no overnight stay"
          }
        ]
      }
    ],
    "gallery": [
      {
        "id": "europe-brussels-winter-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-brussels-winter-v1.jpg",
        "name": "europe brussels winter · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "europe-bruges-winter-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-bruges-winter-v1.jpg",
        "name": "europe bruges winter · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "europe-strasbourg-winter-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-strasbourg-winter-v1.jpg",
        "name": "europe strasbourg winter · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "europe-colmar-winter-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-colmar-winter-v1.jpg",
        "name": "europe colmar winter · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "europe-paris-winter-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-paris-winter-v1.jpg",
        "name": "europe paris winter · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "europe-berlin-winter-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-berlin-winter-v1.jpg",
        "name": "europe berlin winter · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "europe-prague-winter-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-prague-winter-v1.jpg",
        "name": "europe prague winter · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "europe-amsterdam-winter-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/europe-amsterdam-winter-v1.jpg",
        "name": "europe amsterdam winter · AI-generated illustration",
        "isLocal": false
      }
    ],
    "included": [],
    "notIncluded": [],
    "audience": [
      {
        "id": "europe-a1",
        "icon": "sparkles",
        "title": "For festive city wanderers",
        "description": "Historic squares, winter markets, Christmas lights and unhurried evening walks."
      },
      {
        "id": "europe-a2",
        "icon": "compass",
        "title": "For the multi-city curious",
        "description": "A changing landscape across five countries, with two easy day-trip chapters."
      },
      {
        "id": "europe-a3",
        "icon": "moon",
        "title": "For a different kind of NYE",
        "description": "A proposed overnight train journey into the new year, followed by Amsterdam's canals."
      }
    ],
    "tripHighlights": [
      {
        "id": "europe-h1",
        "emoji": "",
        "title": "Christmas in Alsace",
        "description": "Christmas Eve in Strasbourg, followed by a Christmas Day trip to Colmar.",
        "accent": true
      },
      {
        "id": "europe-h2",
        "emoji": "",
        "title": "Two day trips, no hotel switch",
        "description": "Bruges from Brussels on 22 December; Colmar from Strasbourg on 25 December.",
        "accent": false
      },
      {
        "id": "europe-h3",
        "emoji": "",
        "title": "A European city sequence",
        "description": "Brussels, Strasbourg, Paris, Berlin and Prague before the Amsterdam finale.",
        "accent": false
      },
      {
        "id": "europe-h4",
        "emoji": "",
        "title": "Midnight on the rails",
        "description": "Proposed European Sleeper on 31 December, subject to the holiday timetable and availability.",
        "accent": true
      }
    ],
    "pricing": {
      "tiers": [],
      "remainingNote": "",
      "taxNote": "",
      "note": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested.",
      "brochureUrl": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Europe-Christmas-NYE-20-Dec-2026-2-Jan-2027-Grimoire-v1.pdf"
    },
    "faqs": [
      {
        "id": "europe-f1",
        "question": "What are the dates and total duration?",
        "answer": "20 December 2026 - 2 January 2027. 14 days / 13 nights: 12 hotel nights plus 1 overnight sleeper-train night. The count covers arrival in Brussels on 20 December through departure from Amsterdam on 2 January."
      },
      {
        "id": "europe-f2",
        "question": "What is the price and booking amount?",
        "answer": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested."
      },
      {
        "id": "europe-f3",
        "question": "Where does the journey begin and end?",
        "answer": "Delhi to Brussels, arriving on 20 December 2026. Depart Amsterdam for Delhi on 2 January 2027; the arrival date in Delhi depends on the confirmed flight schedule."
      },
      {
        "id": "europe-f4",
        "question": "Where do we stay?",
        "answer": "Brussels 3 nights, Strasbourg 3, Paris 1, Berlin 2, Prague 2, European Sleeper 1 and Amsterdam 1. Hotel names, categories, room sharing and sleeper accommodation are to be confirmed. The overnight train on 31 December is proposed, subject to the operator's holiday timetable and availability."
      },
      {
        "id": "europe-f5",
        "question": "Are flights, trains, meals and tickets included?",
        "answer": "The itinerary describes planned travel and experiences, not price inclusions. Flights, trains, hotels, meals, sightseeing admissions, festival tickets, visas and insurance have not been confirmed as included or excluded. Final inclusions and exclusions will be announced with the price."
      },
      {
        "id": "europe-f6",
        "question": "Where do we spend New Year's Eve?",
        "answer": "NYE is planned aboard the Prague-to-Amsterdam European Sleeper. Amsterdam is on 1 January, not 31 December. Christmas-market hours, attractions, restaurants and shops can change during the holidays. Recheck official 2026 schedules before travel and arrange Christmas Eve dining ahead. NYE is planned aboard the sleeper, not at an Amsterdam party; no party or festival ticket is promised."
      },
      {
        "id": "europe-f7",
        "question": "Are the train times confirmed?",
        "answer": "Brussels - Bruges - Brussels: 22 Dec · direct trains · about 1 hour each way · day bag only. Brussels-Midi - Strasbourg: 23 Dec · direct daytime TGV planned · fastest about 3h48. Strasbourg - Colmar - Strasbourg: 25 Dec · direct trains · about 30 minutes each way. Strasbourg - Paris Gare de l'Est: 26 Dec · direct TGV · fastest about 1h45-2h · no change. Berlin Hbf - Praha hlavní nádraží: 29 Dec · direct EuroCity / ComfortJet · about 4h-4h20. Prague - Amsterdam: 31 Dec-1 Jan · proposed European Sleeper · about 13 hours. All journey times are approximate planning estimates, not reserved services. Confirm the December 2026 / January 2027 timetables, operating dates, stations and tickets before booking, especially the 31 December European Sleeper. Early hotel check-in on arrival is not confirmed."
      },
      {
        "id": "europe-f8",
        "question": "What should we know about Christmas-market hours?",
        "answer": "The 6 PM closing time on 24 December is a planning assumption pending the official 2026 schedule. City illuminations typically continue beyond Christmas. Colmar's published 2026 market schedule runs through 29 December, with Christmas Day hours of 10 AM-8 PM. Recheck before travel; individual venues may differ. Prague's major Christmas markets usually continue into January. Confirm the official 2026-27 dates and opening hours before travel. Christmas-market hours, attractions, restaurants and shops can change during the holidays. Recheck official 2026 schedules before travel and arrange Christmas Eve dining ahead. NYE is planned aboard the sleeper, not at an Amsterdam party; no party or festival ticket is promised."
      }
    ]
  }
}$europe$::jsonb;
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure')
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover
      and v_existing.inclusions = '{}'::text[] and v_existing.deleted_at is null
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure'))
      and exists (select 1 from public.spell_changes where id = 'e2012026-c117-4e3d-a501-020120270003' and spell_id = v_id and kind = 'published') then return; end if;
    raise exception 'Europe spell already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug')
    or exists (select 1 from public.spell_departures where id = v_dep_id)
    or exists (select 1 from public.spell_changes where id = 'e2012026-c117-4e3d-a501-020120270003') then
    raise exception 'Europe publication identity collision; no existing record replaced';
  end if;
  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p)
  ) into v_before;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','celebration','published','new',false,
    v_content->>'location','Europe',14,13,0,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    '{}'::text[],v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,v_content->'departure'->>'date_label','2026-12-20','2027-01-02',0,null,'scheduled');
  if v_before is distinct from jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d where id <> v_dep_id),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p)
  ) then
    raise exception 'Existing data changed during Europe publication';
  end if;
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values ('e2012026-c117-4e3d-a501-020120270003',v_id,'published','The Europe Christmas + NYE Spell is live','20 December 2026 - 2 January 2027. All 14 days, 12 hotel nights and 1 proposed sleeper night. Price TBA; Grimoire attached; applications not open yet.');
end $$;

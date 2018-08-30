# Generieke Hypermedia API client
[![Build Status](https://travis-ci.com/ddvlanck/generic-hypermedia-api-client.svg?branch=master)](https://travis-ci.com/ddvlanck/generic-hypermedia-api-client)

Er wordt gebouwd aan een specificatie van generieke bouwblokken voor API's in Vlaanderen. Dit is deel van de onderzoeksgroep [Werkgroep datastandaarden van het Stuurorgaan](https://overheid.vlaanderen.be/stuurorgaan-werkgroepen).

Een [generieke hypermedia API](https://github.com/Informatievlaanderen/generieke-hypermedia-api) beschrijft in elke respons de verdere stappen die vanaf dat punt kunnen worden genomen met Hypermedia controls. Een client kan vervolgens een generieke afhandeling voorzien voor elk van deze bouwblokken. In deze repository wordt de _clientside_ implementatie van deze bouwblokken voorzien.

# Implementatie van de generieke bouwblokken

De bouwblokken die reeds geïmplementeerd zijn:

* [Metadata](https://github.com/ddvlanck/generic-hypermedia-api-client/wiki/MetadataHandler)
* [Paginering](https://github.com/ddvlanck/generic-hypermedia-api-client/wiki/PaginationHandler)
* [Taal](https://github.com/ddvlanck/generic-hypermedia-api-client/wiki/LanguageHandler)
* [Versionering](https://github.com/ddvlanck/generic-hypermedia-api-client/wiki/VersioningHandler)
* [Full Text Search](https://github.com/ddvlanck/generic-hypermedia-api-client/wiki/FullTextSearchHandler)
* [CRUD](https://github.com/ddvlanck/generic-hypermedia-api-client/wiki/CRUDHandler)

Om gebruik te kunnen maken is een [ApiClient](https://github.com/ddvlanck/LinkedData/wiki/ApiClient) nodig

## Bin usage

Na installatie van het project via `npm install generic-hypermedia-api-client` kan de package eenvoudig getest worden via een bin script. Hiervoor dient de gebruiker het volgende commando uit te voeren:
```
> generic-hypermedia-api-client URL handler_1 handler_2 ...
```

### Handlers

De handler werden gemapt op hun naam zonder de suffix _Handler_. Per handler kunnen ook verschillende opties meegegeven worden.

#### metadata (MetadataHandler)
* `--followdoclink` : volg een gevonden api documentatie link

#### pagination (PaginationHandler)
Geen opties mogelijk

#### language (LanguageHandler)
* `-l` : verwacht een de **waarde** voor een `Accept-Language` header

#### versioning (VersioningHandler)
* `--followversionlink` : volg de geversioneerde URL als deze gevonden wordt

#### full_text_search (FullTextSearchHandler)
* `--queryurl`: fetch de template URL met ingevulde parameters
* `-values`   : waarden om als values in te vullen in de template URL
* `-keys`     : waarden om als keys in te vullen in de template URL

#### crud (CRUDHandler)
Geen opties mogelijk

### Voorbeeld

```
> generic-hypermedia-api-client http://tw06v036.ugent.be/api/all metadata pagination
```
Dit commando zal de URL _http://tw06v036.ugent.be/api/all_ fetchen en daarna zullen de _MetadataHandler_ en _PaginationHandler_ de data verwerken.

```
> generic-hypermedia-api-client http://tw06v036.ugent.be/api/language language -l nl,en;q=0.9
```

Dit commando zal de URL _http://tw06v036.ugent.be/api/language_ fetchen waarbij de `Accept-Language` header meegestuurd wordt met de waarde `nl,en;q=0.9`. De ontvangen data wordt door de LanguageHandler gestuurd.

### Endpoints
* `/api` = entrypoint.
* `/api/documentation` = dummydata voor MetadataHandler.
* `/api/pagination` = dummydata voor PaginationHandler.
* `/api/language` = dummydata voor LanguageHandler.
* `/api/versioning` = dummydata voor VersioningHandler
* `/api/fullTextSearch` = dummydata voor FullTextSearchHandler
* `/api/crud/1` = dummydata voor CRUDHandler
* `/api/all` = dummydata voor MetadataHandler, PaginationHandler, LanguageHandler en VersioningHandler. Dit endpoint kan gebruikt worden om _meerdere_ bouwblokken samen te testen.

## Testen - TODO (install)



De eenvoudigste manier is om deze repository te clonen naar de eigen computer. In het bestand **index.ts** kunnen de verschillende _code snippets_ (zie onder) geplaatst worden om deze te testen. De eerste keer na het clonen moet het commando `npm run build` uitgevoerd worden. Daarna en alle volgende keren volstaat het om `node index.js` uit te voeren.

Om te testen kan gebruik gemaakt worden van de [Generieke-Hypermedia-API-Client-Testserver](https://github.com/ddvlanck/generic-hypermedia-api-client-testserver). Dit is een server die enkel data teruggeeft en is te bereiken op `http://tw06v036.ugent.be/api`.

Voorbeeld data voor metadataHandler:

```
{
        "@context": [
            "http://www.w3.org/ns/hydra/context.jsonld",
            "https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/1.1/dcat-ap_1.1.jsonld",
            {
                "hydra": "http://www.w3.org/ns/hydra/core#",
                "dc": "http://purl.org/dc/terms/",
                "dcat": "https://www.w3.org/ns/dcat#",
                "hydra:apiDocumentation" : { "@type" : "@id"}
            }
        ],
        "@id": "/api",
        "@type": ["EntryPoint", "Distribution"],
        "hydra:apiDocumentation": "/api/documentation",
        "dc:issued": "2016-01-10",
        "dc:modified": "2018-07-24"
};
```

Meer voorbeelden kunnen gevonden worden bij de beschrijving van de bouwblokken in de repository van de [Generieke Hypermedia API](https://github.com/Informatievlaanderen/generieke-hypermedia-api).

## Testen van de bouwblokken - Voorbeelden

* MetadataHandler 

```typescript
const client = new ApiClient(null);
const metadataHandler = new MetadataHandler(
                {
                    metadataCallback: (metadata) => console.log(metadata),
                    apiClient: client,
                    followDocumentationLink: true, //If there's an api documentation link, it will be fetched. You can set it to false if you want!
                }
            );
client.fetch('http://tw06v036.ugent.be/api', [ metadataHandler ]);
```

* PaginationHandler

```typescript
const client = new ApiClient(null);
const pagineringHandler = new PaginationHandler(
                {
                    pagedataCallback: (pagedata) => console.log(pagedata),
                    subjectStream: client.subjectStream
                }
            )
client.fetch('http://tw06v036.ugent.be/api/pagination', [ pagineringHandler ]); 
```

* LanguageHandler

```typescript
const client = new ApiClient(null);
const languageHandler = new LanguageHandler(
                {
                    languageCallback: (language) => {
                        language.stream.on('data', (data) => {
                            if (typeof data === 'object') {
                                console.log(data.object.value);
                            } else {
                                console.log(data);
                            }
                        })
                    },
                    acceptLanguageHeader: 'nl,en;q=0.8'  //The Accept-Language header string    (supported languages on the server are nl, fr and en)
                }
            )
client.fetch('http://tw06v036.ugent.be/api/language', [ languageHandler ]);
```

* VersioningHandler

```typescript
const client = new ApiClient(null);
const versioningHandler = new VersioningHandler({
                versionCallback: version => {
                    version.stream.on('data' , (data) => {
                        console.log(data);
                    })
                },
                apiClient: client,
                datetime: new Date(2018, 8, 14 ),
                followLink: false
            })
client.fetch('http://tw06v036.ugent.be/api/versioning', [ versioningHandler ]);
```

* FullTextSearchHandler

```typescript
const client = new ApiClient(null);
const fts = new FullTextSearchHandler({
        callback: (fts) => {
            fts.stream.on('data', (data) => {
                console.log(data);
            })
        },
        apiClient: client,
        queryValues: ['Bob']
        //queryKeys: ['Naam']   //Optioneel
});
client.fetch('http://tw06v036.ugent.be/api/fullTextSearch', [ fts ]);
```

* CRUDHandler

```typescript
const client = new ApiClient(null);
const crud = new CRUDHandler({
        crudCallback: (crud) => console.log(crud)
});
client.fetch('http://tw06v036.ugent.be/api/crud/1', [ crud ]);
```

Het is ook mogelijk om meerdere bouwblokken samen te testen. Je maakt de handlers aan, zoals hierboven beschreven en geeft ze mee in de array. De URL die je hier best voor gebruikt is `http://tw06v036.ugent.be/api/all`. 

```typescript
const client = new ApiClient(null);
const metadataHandler = new MetadataHandler(
                {
                    metadataCallback: (metadata) => console.log(metadata),
                    apiClient: client,
                    followDocumentationLink: true, //If there's an api documentation link, it will be fetched. You can set it to false if you want!
                }
            );
const pagineringHandler = new PaginationHandler(
                {
                    pagedataCallback: (pagedata) => console.log(pagedata),
                    subjectStream: client.subjectStream
                }
            );
client.fetch('http://tw06v036.ugent.be/api/all', [ metadataHandler, pagineringHandler ]);
```



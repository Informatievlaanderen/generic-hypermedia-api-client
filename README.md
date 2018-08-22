# Implementatie van de generiek bouwblokken

De bouwblokken die reeds geïmplementeerd zijn:

* [Metadata](https://github.com/ddvlanck/LinkedData/wiki/MetadataHandler)
* [Paginering](https://github.com/ddvlanck/LinkedData/wiki/PaginationHandler)
* [Taal](https://github.com/ddvlanck/LinkedData/wiki/LanguageHandler)
* [Versionering](https://github.com/ddvlanck/LinkedData/wiki/VersioningHandler)

Om gebruik te kunnen maken van deze bouwblokken is een [ApiClient](https://github.com/ddvlanck/LinkedData/wiki/ApiClient) nodig 

## Testen

De eenvoudigste manier is om een ZIP te downloaden van het project. In het bestand **index.ts** kunnen de verschillende bouwblokken getest worden. Om een bouwblok te kunnen testen is altijd een _ApiClient_ nodig. De _fetch-methode_ van deze client verwacht een URL en een array van handlers.

## Voorbeelden

Het testen van de _MetadataHandler_ :

```typescript
const client = new ApiClient(null);
const metadataHandler = new MetadataApiHandler(
                {
                    metadataCallback: (metadata) => console.log(metadata),
                    apiClient: client,
                    followDocumentationLink: true, //If there's an api documentation link, it will be fetched. You can set it to false if you want!
                    subjectStream: client.subjectStream
                }
            );
client.fetch('http://localhost:3001/api', [ metadataHandler ]);
```

Het testen van de _PagineringHandler_ :

```typescript
const client = new ApiClient(null);
const pagineringHandler = new PaginationHandler(
                {
                    pagedataCallback: (pagedata) => console.log(pagedata),
                    subjectStream: client.subjectStream
                }
            )
client.fetch('http://localhost:3001/api/pagination', [ pagineringHandler ]); 
```

Het testen van de _LanguageHandler_ :

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
                    acceptLanguageHeader: 'nl,en;q=0.8'  //Supported languages on the server are nl, en and fr
                }
            )
client.fetch('http://localhost:3001/api/language', [ languageHandler ]);
```

Hieronder bevindt zich een code snippet voor het testen van de _VersioningHandler_. Het resultaat is voorlopig enkel een link die wordt teruggestuurd van de server. Voor meer info, klik [hier](https://github.com/ddvlanck/LinkedData/wiki/VersioningHandler).

```typescript
const client new ApiClient(null);
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
client.fetch('http://localhost:3001/api/versioning', [ versioningHandler ]);
```

Het is ook mogelijk om meerdere bouwblokken samen te testen. Je maakt hiervoor de handlers aan, zoals hierboven en geeft ze mee in de array. De URL die je hiervoor kan gebruiken is `http://localhost:3001/api/all`.

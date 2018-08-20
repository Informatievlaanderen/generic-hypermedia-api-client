# Implementatie van de generiek bouwblokken

De bouwblokken die reeds geïmplementeerd zijn:

* (Metadata)[https://github.com/ddvlanck/LinkedData/wiki/MetadataHandler]
* (Paginering)[https://github.com/ddvlanck/LinkedData/wiki/PaginationHandler]
* (Taal)[https://github.com/ddvlanck/LinkedData/wiki/LanguageHandler]
* (Versionering)[https://github.com/ddvlanck/LinkedData/wiki/VersioningHandler]


## Testen

De eenvoudigste manier is om een ZIP te downloaden van het project. In het bestand **index.ts** kunnen de verschillende bouwblokken getest worden. Om een bouwblok te kunnen testen is altijd een _ApiClient_ nodig. De _fetch-methode_ van deze client verwacht een URL en een array van handlers.

## Voorbeelden

Het testen van de _MetadataHandler_ :

`const client = new ApiClient(null);\n
 const metadataHandler = new MyMetadataApiHandler(
                {
                    metadataCallback: (metadata) => console.log(metadata),
                    apiClient: client,
                    followDocumentationLink: true,
                    subjectStream: client.subjectStream
                }
            );
 client.fetch('http://localhost:3001/api', [ metadataHandler ]);
`


# Implementatie van de generiek bouwblokken

De bouwblokken die reeds geïmplementeerd zijn:

* Metadata
* Paginering
* Taal
* Versionering

## Testen

De eenvoudigste manier is om een ZIP te downloaden van het project. In het bestand **index.ts** kunnen de verschillende bouwblokken getest worden. Om een bouwblok te kunnen testen is altijd een _ApiClient_ nodig. De _fetch-methode_ van deze client verwacht een URL en een array van handlers. Hieronder zijn verschillende voorbeelden te vinden:


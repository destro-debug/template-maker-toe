
DST TOE3 TEMPLATE MAKER
Version 1.0.0
DST TOOLS

==================================================
1. PROJECT OVERVIEW
==================================================

The DST TOE3 Template Maker is a standalone tool for
creating individual TOE3 truck skin JSON records.

It contains two editors:

- CABIN EDITOR
- TRAILER EDITOR

Each editor generates one JSON record at a time.

The Maker does not create or modify skin images.
You must provide the image URLs yourself.


==================================================
2. PROJECT FILES
==================================================

index.html
    Main homepage and editor selection.

cabin.html
    Cabin skin record generator.

trailer.html
    Trailer skin record generator.

styles.css
    Shared styling, layout and theme design.

app.js
    Shared JavaScript functionality.

README.txt
    Project documentation.


==================================================
3. RUNNING THE PROJECT
==================================================

1. Keep all six files in the same root directory.
2. Open index.html through a local development server
   or publish the folder using a static website host.
3. Select CABIN or TRAILER.
4. Open the corresponding editor.
5. Complete the required fields.
6. Generate the JSON record.


==================================================
4. IMAGE REQUIREMENTS
==================================================

Every skin record requires two separate HTTPS image URLs.

IMAGE URL:
The finished truck or trailer with the skin applied.

TEMPLATE URL:
The actual skin texture/template image used in the game.

Both links must point to images that can be loaded
by the browser before a record can be generated.

The Maker does not require a specific image hosting
provider.


==================================================
5. GENERATED RECORDS
==================================================

The Maker generates one JSON object per skin.

It does not automatically publish records to the
main DST Skin Catalogue.

After generating a record:

1. Copy the JSON.
2. Send it to the project owner.
3. Wait for review and approval.
4. The approved record can then be added manually
   to the main TOE3 skin data file.

Do not add unreviewed records to the public catalogue.


==================================================
6. IMPORTANT NOTES
==================================================

- Do not manually edit automatically generated IDs.
- Do not manually edit automatically generated display names.
- Check for duplicate IDs before submitting a record.
- Use valid HTTPS image links.
- Keep descriptions within the 300-character limit.
- Each generated record should represent one skin.
- The Maker does not store a submission history.
- Resetting a form should not erase an existing output.
- Clearing the output should not reset the form.


==================================================
7. PROJECT OWNERSHIP
==================================================

DST TOOLS
TOE3 TEMPLATE MAKER

Version: 1.0.0

End of README.

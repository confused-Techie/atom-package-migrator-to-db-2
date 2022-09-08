This readme is brief and disorganized. My apologies.

---

This was the latest migration to the Database from the collection of eligible packages to become migrated.

The command to complete migration was the following:

```shell
node . | Tee-Object -file log.txt
```

This script in large part was written and created by @Digitalone1 and full respect and appreciation to them for creating this script.

Many failsafe's were implemented to avoid failures mid way migration.

As well as some limits were expanding on the database, that will require updates to the newly created scripts.

---

For those looking to help identify the packages that failed to migrate successfully the full logs are in the `log.txt` file and this will be split into a few separate files within the `log` folder at the root of this project.

The command used to split these files is the following:

```shell 
$i=0; Get-Content log.txt -ReadCount 1000 | %{$i++; $_ | Out-File out_$i.txt -Encoding UTF8}
```

Meaning each log file is 1000 long line segments from the raw logs themselves.

Otherwise when attempting to identify a failure, the source code from `main.js` will be needed to know what values are pulled individually from the file, as well as knowing that the source of all the data retrieved here is located in [atom-package-collection](https://github.com/confused-Techie/atom-package-collection/tree/main/out/packages)

Unfortunately this repo is truncated on GitHub and may need to be downloaded and searched to find the files that are referred to, since all packages there are saved by a UUIDv4 assigned to them, rather than names.

(If in Atom/Pulsar use CTRL+SHIFT+F to search project wide, if opening this repo in its root)

If any packages are found as having issues, please make an issue on this repo, and if the solution is also found it'd be fantastic to include this as well.

Since the database is not meant to be publicly accessible any credentials as well as file system information from my local machine have been `[REDACTED]`.

Any and all help to make sure everyone's hard work is included on our new backend is appreciated, and everyone's hard work to get to this point is as well, of course appreciated.

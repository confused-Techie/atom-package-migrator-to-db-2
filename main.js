const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

const srcDir = "[REDACTED]";

async function setup() {
  const sql = postgres({
    host: '[REDACTED]',
    username: '[REDACTED]',
    password: '[REDACTED]',
    database: 'pulsar-packages',
    port: 25060,
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync("ca-certificate.crt").toString()
    }
  });
  
  try {
    const files = fs.readdirSync(srcDir);
    totalFiles = files.length;
    
    let all_files = [];
    
    for await (const file of files) {
      all_files.push( await handleFile(file));
    }
    
    console.log("All Files successfully injested.");
    
    await database_migration(all_files, sql);
    
  } catch(err) {
    console.error(`Severe Error Reading from Disk: ${err}`);
    process.exit(1);
  }
}

async function handleFile(file) {
  try {
    let rawdata = fs.readFileSync(`${srcDir}${path.sep}${file}`, { encoding: "utf8" });
    let data = JSON.parse(rawdata);
    
    console.log(`Successfully Loaded file ${file}`);
    
    return data;
    
  } catch(err) {
    console.log(`Error Caught during file handle: ${err}, for ${file}`);
    console.log(`Skipping: ${file}`);
    return;
  }
}

async function database_migration(array_of_package_object_full, sql_storage) {
  await sql_storage.begin(async () => {
    const creationMethod = "Migrated from Atom.io";
    let i = 1;
    
    for (const p of array_of_package_object_full) {
      // populate packages table 
      
      const pack_data = JSON.stringify({
        "name": p.name,
        "repository": p.repository,
        "readme": p.readme,
        "metadata": p.metadata
      });
      
      let command = await sql_storage`
        INSERT INTO packages 
        (name, creation_method, data, downloads, stargazers_count, original_stargazers) VALUES
        (${p.name}, ${creationMethod}, ${pack_data}, ${p.downloads}, ${p.stargazers_count}, ${p.stargazers_count})
        RETURNING pointer;
      `;
      
      const pointer = command[0].pointer;
      if (pointer === undefined) {
        throw `Cannot insert ${p.name} in packages table at iteration ${i}`;
      }
      
      // Populate names table 
      command = await sql_storage`
        INSERT INTO names 
        (name, pointer) VALUES
        (${p.name}, ${pointer});
      `;
      
      if (command.count === 0) {
        `Cannot insert ${p.name} in names table at iteration ${i}`;
      }
      
      // Populate versions table 
      const latest = p.releases.latest;
      const pv = p.versions;
      
      for (const ver in pv) {
        const status = (ver === latest) ? "latest" : "published";
        
        let engine = pv[ver].engines;
        let jsonEngine = JSON.stringify(engine);
        
        let license = pv[ver].license; // saving seperatly since it seems the meta shallow copy, 
        // deletes this value before passing to the db 
        
        
        // Save version object into meta, but strip engiens and license properties 
        // since we save them in the specific separete columns.
        let meta = pv[ver];
        delete meta.engines;
        delete meta.license;
        const jsonMeta = JSON.stringify(meta);
        
        // since many packages don't define an engines field we will do it for them.
        // Following suit with what Atom internal packages do.
        if (engine === undefined) {
          engine = {
            "atom": "*"
          };
          
          jsonEngine = JSON.stringify(engine);
        }
        
        // Since seemingly a common practice is for packages to specify no license, we will account for that as well.
        if (license === undefined) {
          license = "NONE";
        }
        
        if (pointer === undefined || status === undefined || ver === undefined || license === undefined || jsonEngine === undefined || jsonMeta === undefined) {
          console.log(`Cannot insert UNDEFINED Values: ${ver} version for ${p.name} package in versions table at iteration ${i}`);
          continue;
        }
        
        try {
          command = await sql_storage`
            INSERT INTO versions
            (package, status, semver, license, engine, meta) VALUES 
            (${pointer}, ${status}, ${ver}, ${license}, ${jsonEngine}, ${jsonMeta})
            RETURNING id;
          `;
          
          if (command[0].id === undefined) {
            console.log(`Cannot insert ${ver} version for ${p.name} package in versions table at iteration ${i}`);
            continue;
          }
        } catch(err) {
          console.error(`Failed to migrate ${p.name} at ${ver}: ${err}`);
          continue;
        }
        
        i++;
      }
      
      console.log(`Successfully migrated package: ${p.name}`);
    }
  }).then((v) => {
    console.log("Atom Packages successfully migrated.");
    process.exit(0);
  }).catch((e) => {
    console.error(e);
    console.error("Rollback. Packages have not been migrated.");
    process.exit(1);
  });
}

// Call the setup function
setup();

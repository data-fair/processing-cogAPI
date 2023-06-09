const fs = require('fs-extra')
const path = require('path')
const schema = require('./schema.json')
const csvStringify = require('csv-stringify/sync').stringify

const fields = schema.map((field) => field.key)
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const items = []

module.exports = async (processingConfig, tmpDir, axios, log, apiKey) => {
  const writeStream = await fs.openSync(path.join(tmpDir, 'Code Officiel Géographie.csv'), 'w')
  await log.step('Traitement des données')
  let communes = await fs.readJsonSync(path.join(tmpDir, 'communes.json'))
  if (processingConfig.filter) {
    await log.info(`Filtrage des communes sur le code département ${processingConfig.filter}`)
    communes = communes.filter((commune) => commune.code.startsWith(processingConfig.filter))
  }
  for (const commune of communes) {
    const codeCommune = commune.code
    let url = `https://api.insee.fr/metadonnees/V1/geo/commune/${codeCommune}/ascendants`
    if (commune.type === 'ArrondissementMunicipal') {
      url = `https://api.insee.fr/metadonnees/V1/geo/arrondissementMunicipal/${codeCommune}/ascendants`
    }
    let find = false
    let communeInfo
    while (!find) {
      try {
        communeInfo = await axios({
          method: 'get',
          url,
          headers: {
            Authorization: 'Bearer ' + apiKey
          }
        })
        if (communeInfo) {
          find = true
        }
      } catch (err) {
        await log.info(`Erreur lors de la récupération des informations de la commune ${codeCommune}, nouvelle tentative dans 2 secondes`)
        await wait(2000)
      }
    }
    if (communeInfo) {
      const item = [
        commune.code,
        commune.intitule,
        communeInfo.data.filter((elem) => elem.type === 'Arrondissement')[0] ? communeInfo.data.filter((elem) => elem.type === 'Arrondissement')[0].code : '',
        communeInfo.data.filter((elem) => elem.type === 'Arrondissement')[0] ? communeInfo.data.filter((elem) => elem.type === 'Arrondissement')[0].intitule : '',
        communeInfo.data.filter((elem) => elem.type === 'Departement')[0] ? communeInfo.data.filter((elem) => elem.type === 'Departement')[0].code : '',
        communeInfo.data.filter((elem) => elem.type === 'Departement')[0] ? communeInfo.data.filter((elem) => elem.type === 'Departement')[0].intitule : '',
        communeInfo.data.filter((elem) => elem.type === 'Intercommunalite')[0] ? communeInfo.data.filter((elem) => elem.type === 'Intercommunalite')[0].code : '',
        communeInfo.data.filter((elem) => elem.type === 'Intercommunalite')[0] ? communeInfo.data.filter((elem) => elem.type === 'Intercommunalite')[0].intitule : '',
        communeInfo.data.filter((elem) => elem.type === 'Region')[0] ? communeInfo.data.filter((elem) => elem.type === 'Region')[0].code : '',
        communeInfo.data.filter((elem) => elem.type === 'Region')[0] ? communeInfo.data.filter((elem) => elem.type === 'Region')[0].intitule : '',
        communeInfo.data.filter((elem) => elem.type.includes('AireDAttractionDesVilles'))[0] ? communeInfo.data.filter((elem) => elem.type.includes('AireDAttractionDesVilles'))[0].code : '',
        communeInfo.data.filter((elem) => elem.type.includes('AireDAttractionDesVilles'))[0] ? communeInfo.data.filter((elem) => elem.type.includes('AireDAttractionDesVilles'))[0].intitule : '',
        communeInfo.data.filter((elem) => elem.type.includes('BassinDeVie'))[0] ? communeInfo.data.filter((elem) => elem.type.includes('BassinDeVie'))[0].code : '',
        communeInfo.data.filter((elem) => elem.type.includes('BassinDeVie'))[0] ? communeInfo.data.filter((elem) => elem.type.includes('BassinDeVie'))[0].intitule : '',
        communeInfo.data.filter((elem) => elem.type.includes('UniteUrbaine'))[0] ? communeInfo.data.filter((elem) => elem.type.includes('UniteUrbaine'))[0].code : '',
        communeInfo.data.filter((elem) => elem.type.includes('UniteUrbaine'))[0] ? communeInfo.data.filter((elem) => elem.type.includes('UniteUrbaine'))[0].intitule : '',
        communeInfo.data.filter((elem) => elem.type.includes('ZoneDEmploi'))[0] ? communeInfo.data.filter((elem) => elem.type.includes('ZoneDEmploi2020'))[0].code : '',
        communeInfo.data.filter((elem) => elem.type.includes('ZoneDEmploi'))[0] ? communeInfo.data.filter((elem) => elem.type.includes('ZoneDEmploi2020'))[0].intitule : ''
      ]
      items.push(item)
      await wait(2000)
    }
  }
  await log.info(`Ecriture de ${items.length} lignes dans le fichier csv`)
  await fs.writeSync(writeStream, csvStringify(items, { header: true, delimiter: ',', columns: fields }))
}

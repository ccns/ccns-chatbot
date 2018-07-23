const config = require('config')
const elasticsearch_host = process.env.ES_HOST || config.get('elasticsearch_host')

const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
    host: elasticsearch_host,
});

async function query(q, dept) {
    try {
        let obj = {};
        let query = {};
        let bool = {};
        let course_code_bool = {};

        if(dept)
            bool.filter = {match: {dept_no: dept}};

        // bool query for course code
        course_code_bool.must = [];
        course_code_bool.must.push({match: {dept_no: {query: q, boost: 1}}});
        course_code_bool.must.push({match: {course_no: {query: q, boost: 1}}});

        bool.should = [];
        bool.should.push({bool: course_code_bool});
        bool.should.push({match: {name: {query: q, boost: 4}}});
        bool.should.push({match: {teacher: {query: q, boost: 3}}});
        bool.should.push({match: {dept_name: {query: q, boost: 2}}});
        bool.should.push({match: {required: {query: q, boost: 1}}});
        query.bool = bool;
        obj.query = query;
        obj.size = 10;

        const response = await client.search({
            index: 'ncku-course-db',
            type: 'courses',
            body: obj
        });
        return response.hits.hits
    } catch (error) {
        console.trace(error.message)
    }
}

function isDeptNo(dept_no) {
    return ["A2", "A3", "A4", "A5", "A6", "AA", "AH", "AN", "C0", "A1", "A7", "A9", "AG", "B1", "K1", "B2", "K2", "B3", "K3", "B5", "K5", "K4", "K7", "K8", "C1", "L1", "C2", "L2", "C3", "L3", "C4", "L4", "F8", "L7", "LA", "VF", "E0", "E1", "N1", "E3", "N3", "E4", "N4", "E5", "N5", "E6", "N6", "E8", "N8", "NC", "E9", "N9", "F0", "P0", "F1", "P1", "F4", "P4", "Q4", "F5", "P5", "F6", "P6", "F9", "P8", "N0", "NA", "NB", "H1", "R1", "H2", "R2", "H3", "R3", "H4", "R4", "H5", "R5", "R9", "R0", "R6", "R7", "R8", "RA", "RB", "RD", "RZ", "I2", "T2", "I3", "T3", "I5", "I6", "T6", "I7", "T7", "I8", "S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "SA", "SB", "T1", "T4", "T8", "T9", "TA", "TC", "D2", "U2", "D4", "D5", "U5", "D8", "U7", "U1", "U3", "E2", "N2", "Q1", "Q3", "Q6", "Q7", "F7", "ND", "P7", "Q5", "P9", "V6", "V8", "V9", "VA", "VB", "VC", "VD", "VE", "VG", "VH", "VJ", "VK", "VL", "VM", "VN", "E7", "N7", "F2", "P2", "F3", "P3", "PA", "PB", "C5", "L5", "C6", "L6", "Z0", "Z2", "Z3", "Z5"].indexOf(dept_no) > -1
}

module.exports = {
    query,
    isDeptNo
}

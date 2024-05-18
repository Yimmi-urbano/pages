const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const slugify = require('slugify');

const app = express();
const PORT = 4000;

app.use(bodyParser.json());
app.use(cors());

// Conexión a MongoDB
mongoose.connect('mongodb+srv://data_user:wY1v50t8fX4lMA85@cluster0.entyyeb.mongodb.net/pages', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Modelo de página
const PageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image_default: { type: String },
    slug: { type: String, unique: true },
    content: { type: Object, required: true },
    seo_description: { type: String },
    seo_keywords: { type: String },
    is_available: { type: Boolean }
});

// Middleware para generar y asegurar unicidad del slug antes de guardar
PageSchema.pre('validate', async function(next) {
    if (this.isModified('title') || this.isNew) {
        const baseSlug = slugify(this.title, { lower: true, strict: true });
        let uniqueSlug = baseSlug;
        const domain = this.domain; // El dominio se pasará como parte del documento

        const collectionName = getCollectionName(domain);
        const PageModel = mongoose.model('Page', PageSchema, collectionName);

        let slugExists = await PageModel.findOne({ slug: uniqueSlug });
        let counter = 2;

        while (slugExists) {
            uniqueSlug = `${baseSlug}-${counter}`;
            slugExists = await PageModel.findOne({ slug: uniqueSlug });
            counter++;
        }
        this.slug = uniqueSlug;
    }
    next();
});

// Función para obtener el nombre de la colección basado en el dominio
function getCollectionName(domain) {
    return `pages-${domain}`;
}

// Rutas de la API

// Obtener todas las páginas
app.get('/api/pages', async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            return res.status(400).json({ message: 'Domain header is required' });
        }
        const collectionName = getCollectionName(domain);
        const PageModel = mongoose.model('Page', PageSchema, collectionName);

        const pages = await PageModel.find({});
        res.json(pages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Obtener una página por ID
app.get('/api/pages/:id', async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            return res.status(400).json({ message: 'Domain header is required' });
        }
        const collectionName = getCollectionName(domain);
        const PageModel = mongoose.model('Page', PageSchema, collectionName);

        const page = await PageModel.findById(req.params.id);

        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }
        res.json(page);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Crear una nueva página
app.post('/api/pages', async (req, res) => {
    const domain = req.headers['domain'];
    if (!domain) {
        return res.status(400).json({ message: 'Domain header is required' });
    }
    const collectionName = getCollectionName(domain);
    const PageModel = mongoose.model('Page', PageSchema, collectionName);

    const page = new PageModel(req.body);
    page.domain = domain; // Añadimos el dominio al documento

    try {
        const newPage = await page.save();
        res.status(201).json(newPage);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Obtener una página por slug
app.get('/api/pages/slug/:slug', async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            return res.status(400).json({ message: 'Domain header is required' });
        }
        const collectionName = getCollectionName(domain);
        const PageModel = mongoose.model('Page', PageSchema, collectionName);

        const page = await PageModel.findOne({ slug: req.params.slug });

        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }
        res.json(page);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Eliminar una página por ID
app.delete('/api/pages/:id', async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            return res.status(400).json({ message: 'Domain header is required' });
        }
        const collectionName = getCollectionName(domain);
        const PageModel = mongoose.model('Page', PageSchema, collectionName);

        const page = await PageModel.findById(req.params.id);

        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }

        await page.deleteOne(); // O utiliza page.findOneAndDelete() si deseas recibir el documento eliminado como respuesta
        res.json({ message: 'Page deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



// Middleware para manejar errores 404
app.use((req, res, next) => {
    res.status(404).json({ message: 'Not found' });
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

// Escuchar en el puerto especificado
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

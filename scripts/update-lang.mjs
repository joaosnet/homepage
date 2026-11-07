import fs from 'fs';

const path = 'c:/Users/joaod/Documents/GitHub/homepage/assets/js/lang.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const extensions = {
    pt: {
        nav: {
            pesquisa: "Pesquisa",
            equipe: "Equipe",
            datasets: "Datasets",
            softwares: "Patentes & Open Source",
            noticias: "Notícias",
            cursos: "Cursos",
            temaAuto: "Tema: Automático",
            fonteReset: "Tamanho padrão da fonte (100%)",
            instagram: "Instagram Oficial do LaPS"
        },
        members: {
            title: "Equipe do LaPS",
            subtitle: "Pesquisadores, docentes e discentes que impulsionam a ciência e a inovação tecnológica no laboratório:",
            todos: "Todos",
            professores: "Docentes",
            doutorado: "Doutorado",
            mestrado: "Mestrado",
            graduacao: "Iniciação Científica",
            egressos: "Egressos",
            visaoGrade: "Grade",
            visaoLista: "Lista",
            visaoGrafo: "Grafo",
            buscarMembro: "Buscar por nome, orientador, linha ou projeto...",
            orientador: "Orientador",
            programa: "Vínculo",
            projeto: "Projeto",
            grafoDesc: "Rede interativa de colaboração científica do LaPS. Arraste os nós ou clique para explorar as conexões entre docentes, discentes e linhas de pesquisa."
        },
        datasets: {
            title: "Datasets Científicos Abertos",
            subtitle: "Bases de dados abertas para pesquisa em processamento de sinais, visão computacional e inteligência artificial.",
            acessar: "Acessar Dataset",
            formato: "Formato",
            amostras: "Amostras",
            licenca: "Licença"
        },
        softwares: {
            title: "Patentes & Open Source",
            subtitle: "Repositórios de código aberto no GitHub e registros de propriedade intelectual gerados pelas pesquisas do laboratório.",
            abaOpenSource: "Ferramentas Open Source (LAPSHub)",
            abaPatentes: "Patentes & Registros de Software",
            verRepo: "Ver no GitHub",
            estrelas: "estrelas",
            processo: "Processo",
            inventores: "Inventores",
            status: "Status"
        },
        noticias: {
            title: "Notícias & Destaques",
            subtitle: "Acompanhe as publicações recentes, avanços de projetos, defesas e comunicados oficiais do laboratório.",
            lerMais: "Ler notícia completa",
            fechar: "Fechar",
            publicadoEm: "Publicado em"
        },
        cursos: {
            title: "Cursos & Capacitações",
            subtitle: "Minicursos práticos, treinamentos e oficinas técnicas ofertadas por pesquisadores do LaPS.",
            cargaHoraria: "Carga Horária",
            modalidade: "Modalidade",
            instrutores: "Instrutores",
            topicos: "Tópicos Abordados",
            inscrever: "Mais Informações"
        },
        instagram: {
            badge: "Rede Social Oficial",
            titulo: "Conecte-se com o LaPS no Instagram",
            descricao: "Acompanhe bastidores de bancada, resumos visuais de artigos científicos, eventos acadêmicos e chamadas de bolsas pelo nosso perfil oficial.",
            seguir: "Seguir @laps_ufpa"
        }
    },
    en: {
        nav: {
            pesquisa: "Research",
            equipe: "Team",
            datasets: "Datasets",
            softwares: "Patents & Open Source",
            noticias: "News",
            cursos: "Courses",
            temaAuto: "Theme: Automatic",
            fonteReset: "Default font size (100%)",
            instagram: "Official LaPS Instagram"
        },
        members: {
            title: "LaPS Team",
            subtitle: "Faculty, researchers, and students driving scientific advancement and technological innovation:",
            todos: "All",
            professores: "Faculty",
            doutorado: "PhD Candidates",
            mestrado: "MSc Candidates",
            graduacao: "Undergraduate / IC",
            egressos: "Alumni",
            visaoGrade: "Grid",
            visaoLista: "List",
            visaoGrafo: "Graph",
            buscarMembro: "Search by name, advisor, research line or project...",
            orientador: "Advisor",
            programa: "Program",
            projeto: "Project",
            grafoDesc: "Interactive scientific collaboration network. Drag nodes or click to explore connections among faculty, students, and research topics."
        },
        datasets: {
            title: "Open Scientific Datasets",
            subtitle: "Open-access benchmark datasets for signal processing, computer vision, and machine learning research.",
            acessar: "Access Dataset",
            formato: "Format",
            amostras: "Samples",
            licenca: "License"
        },
        softwares: {
            title: "Patents & Open Source",
            subtitle: "Official open-source repositories on GitHub and intellectual property registrations created at LaPS.",
            abaOpenSource: "Open Source Tools (LAPSHub)",
            abaPatentes: "Patents & Software Registrations",
            verRepo: "View on GitHub",
            estrelas: "stars",
            processo: "Filing No.",
            inventores: "Inventors",
            status: "Status"
        },
        noticias: {
            title: "News & Highlights",
            subtitle: "Discover recent publications, project breakthroughs, thesis defenses, and official announcements.",
            lerMais: "Read full article",
            fechar: "Close",
            publicadoEm: "Published on"
        },
        cursos: {
            title: "Courses & Training",
            subtitle: "Hands-on workshops, technical short courses, and training programs delivered by LaPS researchers.",
            cargaHoraria: "Duration",
            modalidade: "Modality",
            instrutores: "Instructors",
            topicos: "Core Topics",
            inscrever: "More Information"
        },
        instagram: {
            badge: "Official Social Media",
            titulo: "Connect with LaPS on Instagram",
            descricao: "Follow lab experiments, visual research summaries, academic events, and scholarship announcements on our official profile.",
            seguir: "Follow @laps_ufpa"
        }
    },
    de: {
        nav: {
            pesquisa: "Forschung",
            equipe: "Team",
            datasets: "Datensätze",
            softwares: "Patente & Open Source",
            noticias: "Nachrichten",
            cursos: "Kurse",
            temaAuto: "Thema: Automatisch",
            fonteReset: "Standard-Schriftgröße (100%)",
            instagram: "Offizielles LaPS Instagram"
        },
        members: {
            title: "LaPS-Team",
            subtitle: "Wissenschaftler, Dozenten und Studierende, die wissenschaftliche Exzellenz und technologische Innovation vorantreiben:",
            todos: "Alle",
            professores: "Professoren",
            doutorado: "Doktoranden",
            mestrado: "Masterstudierende",
            graduacao: "Bachelor / IC",
            egressos: "Alumni",
            visaoGrade: "Raster",
            visaoLista: "Liste",
            visaoGrafo: "Graph",
            buscarMembro: "Nach Name, Betreuer, Forschung oder Projekt suchen...",
            orientador: "Betreuer",
            programa: "Programm",
            projeto: "Projekt",
            grafoDesc: "Interaktives Kooperationsnetzwerk des LaPS. Ziehen Sie Knoten oder klicken Sie, um Beziehungen zu erkunden."
        },
        datasets: {
            title: "Offene Wissenschaftliche Datensätze",
            subtitle: "Offene Benchmark-Datensätze für Signalverarbeitung, Computer Vision und künstliche Intelligenz.",
            acessar: "Datensatz Öffnen",
            formato: "Format",
            amostras: "Stichproben",
            licenca: "Lizenz"
        },
        softwares: {
            title: "Patente & Open Source",
            subtitle: "Offizielle Open-Source-Repositories auf GitHub und Schutzrechte aus Laborforschungen.",
            abaOpenSource: "Open-Source-Werkzeuge (LAPSHub)",
            abaPatentes: "Patente & Software-Registrierungen",
            verRepo: "Auf GitHub Ansehen",
            estrelas: "Sterne",
            processo: "Aktenzeichen",
            inventores: "Erfinder",
            status: "Status"
        },
        noticias: {
            title: "Nachrichten & Aktuelles",
            subtitle: "Aktuelle Veröffentlichungen, Projektmeilensteine, Promotionen und Bekanntmachungen des Labors.",
            lerMais: "Vollständige Nachricht lesen",
            fechar: "Schließen",
            publicadoEm: "Veröffentlicht am"
        },
        cursos: {
            title: "Kurse & Weiterbildung",
            subtitle: "Praxisnahe Minikurse, Workshops und Fachschulungen von LaPS-Forschern.",
            cargaHoraria: "Dauer",
            modalidade: "Modalität",
            instrutores: "Dozenten",
            topicos: "Themenschwerpunkte",
            inscrever: "Mehr Informationen"
        },
        instagram: {
            badge: "Offizielle Soziale Medien",
            titulo: "Verbinden Sie sich mit dem LaPS auf Instagram",
            descricao: "Verfolgen Sie Einblicke in Forschungsprojekte, visuelle Zusammenfassungen und akademische Ausschreibungen auf unserem offiziellen Kanal.",
            seguir: "@laps_ufpa Folgen"
        }
    },
    fr: {
        nav: {
            pesquisa: "Recherche",
            equipe: "Équipe",
            datasets: "Jeux de Données",
            softwares: "Brevets & Open Source",
            noticias: "Actualités",
            cursos: "Formations",
            temaAuto: "Thème : Automatique",
            fonteReset: "Taille de police par défaut (100%)",
            instagram: "Instagram Officiel du LaPS"
        },
        members: {
            title: "Équipe du LaPS",
            subtitle: "Enseignants-chercheurs et étudiants au cœur de la recherche scientifique et de l'innovation technologique :",
            todos: "Tous",
            professores: "Enseignants",
            doutorado: "Doctorants",
            mestrado: "Étudiants en Master",
            graduacao: "Licence / IC",
            egressos: "Anciens Élèves",
            visaoGrade: "Grille",
            visaoLista: "Liste",
            visaoGrafo: "Graphe",
            buscarMembro: "Rechercher par nom, directeur, thème ou projet...",
            orientador: "Directeur",
            programa: "Programme",
            projeto: "Projet",
            grafoDesc: "Réseau interactif de collaboration scientifique du LaPS. Déplacez ou cliquez sur les nœuds pour explorer les liens."
        },
        datasets: {
            title: "Jeux de Données Scientifiques Ouverts",
            subtitle: "Jeux de données ouverts pour la recherche en traitement du signal, vision par ordinateur et intelligence artificielle.",
            acessar: "Accéder au Jeu de Données",
            formato: "Format",
            amostras: "Échantillons",
            licenca: "Licence"
        },
        softwares: {
            title: "Brevets & Open Source",
            subtitle: "Dépôts open source officiels sur GitHub et titres de propriété intellectuelle issus des recherches du laboratoire.",
            abaOpenSource: "Outils Open Source (LAPSHub)",
            abaPatentes: "Brevets & Enregistrements Logiciels",
            verRepo: "Voir sur GitHub",
            estrelas: "étoiles",
            processo: "N° d'enregistrement",
            inventores: "Inventeurs",
            status: "Statut"
        },
        noticias: {
            title: "Actualités & Faits Marquants",
            subtitle: "Découvrez les publications récentes, avancées de projets, soutenances et annonces officielles du laboratoire.",
            lerMais: "Lire l'article complet",
            fechar: "Fermer",
            publicadoEm: "Publié le"
        },
        cursos: {
            title: "Formations & Cours",
            subtitle: "Ateliers pratiques, cours intensifs et formations techniques dispensés par les chercheurs du LaPS.",
            cargaHoraria: "Durée",
            modalidade: "Modalité",
            instrutores: "Instructeurs",
            topicos: "Thèmes Principaux",
            inscrever: "Plus d'Informations"
        },
        instagram: {
            badge: "Réseau Social Officiel",
            titulo: "Rejoignez le LaPS sur Instagram",
            descricao: "Suivez les coulisses de nos recherches, synthèses visuelles d'articles et opportunités académiques sur notre page officielle.",
            seguir: "Suivre @laps_ufpa"
        }
    }
};

for (const lang of ['pt', 'en', 'de', 'fr']) {
    Object.assign(data[lang].nav, extensions[lang].nav);
    data[lang].members = Object.assign({}, data[lang].members || {}, extensions[lang].members);
    data[lang].datasets = extensions[lang].datasets;
    data[lang].softwares = extensions[lang].softwares;
    data[lang].noticias = extensions[lang].noticias;
    data[lang].cursos = extensions[lang].cursos;
    data[lang].instagram = extensions[lang].instagram;
}

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('lang.json updated successfully with full 4-language parity!');

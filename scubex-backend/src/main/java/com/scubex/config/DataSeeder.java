package com.scubex.config;

import com.scubex.model.*;
import com.scubex.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Seeds realistic demo data (Spanish diving spots) on first startup.
 * Idempotent: checks for the sentinel googleId before inserting anything.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private static final String SENTINEL_GOOGLE_ID = "seed_demo_carlos_001";

    private final UserRepository userRepository;
    private final PublicationRepository publicationRepository;
    private final CommentRepository commentRepository;
    private final PublicationLikeRepository likeRepository;
    private final PublicationSaveRepository saveRepository;
    private final UserFollowRepository followRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.findByGoogleId(SENTINEL_GOOGLE_ID).isPresent()) {
            log.info("DataSeeder: demo data already present, skipping.");
            return;
        }
        log.info("DataSeeder: inserting demo data...");
        seedAll();
        log.info("DataSeeder: done.");
    }

    private void seedAll() {
        // ── Users ────────────────────────────────────────────────────────────────
        User carlos = user(SENTINEL_GOOGLE_ID, "carlos.martinez.buceo@gmail.com",
                "Carlos Martínez", "https://i.pravatar.cc/150?img=12",
                "Carlos M.", null);

        User ana = user("seed_demo_ana_002", "ana.lopez.dive@gmail.com",
                "Ana López", "https://i.pravatar.cc/150?img=47",
                "Ana López · Instructora", null);

        User pedro = user("seed_demo_pedro_003", "pedro.ruiz.mar@gmail.com",
                "Pedro Ruiz", "https://i.pravatar.cc/150?img=53",
                null, null);

        User maria = user("seed_demo_maria_004", "maria.garcia.buceo@gmail.com",
                "María García", "https://i.pravatar.cc/150?img=25",
                "María G.", null);

        User javier = user("seed_demo_javier_005", "javier.sanchez.submarinismo@gmail.com",
                "Javier Sánchez", "https://i.pravatar.cc/150?img=68",
                null, null);

        User laura = user("seed_demo_laura_006", "laura.torres.ocean@gmail.com",
                "Laura Torres", "https://i.pravatar.cc/150?img=32",
                "Laura Torres 🐠", null);

        List<User> users = List.of(carlos, ana, pedro, maria, javier, laura);
        userRepository.saveAll(users);

        // ── Publications ─────────────────────────────────────────────────────────
        // Carlos – Costa Brava
        Publication p1 = pub(carlos,
                "Inmersión en las Illes Medes",
                "Una de las reservas marinas más espectaculares del Mediterráneo. Vimos meros de más de 40 kg, " +
                "bancos de salemas y un pulpo enorme escondido bajo una roca. Visibilidad de 20 metros.",
                "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
                42.0471, 3.2192, daysAgo(45));

        Publication p2 = pub(carlos,
                "Cap de Creus al amanecer",
                "Salida nocturna hasta el faro y primera luz del día bajo el agua. El paisaje volcánico del fondo " +
                "es único en el Mediterráneo. Corriente fuerte pero manejable. Profundidad máxima 28 m.",
                "https://images.unsplash.com/photo-1682687220198-88e9bdea9931?w=800",
                42.3192, 3.3108, daysAgo(30));

        // Ana – Murcia y Almería
        Publication p3 = pub(ana,
                "Cabo de Palos: la pared de La Herradura",
                "Inmersión técnica en el Parque Regional de Calblanque. Gorgonias rojas a 35 metros, nudibranquios " +
                "en cada grieta y una tortuga boba que nos acompañó 10 minutos. Aguas cristalinas a 22 °C.",
                "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800",
                37.6333, -0.7000, daysAgo(20));

        Publication p4 = pub(ana,
                "Cabo de Gata: Arrecife de las Sirenas",
                "El fondo volcánico de Cabo de Gata es diferente a todo lo demás de España. Estrellas de mar " +
                "por todas partes, morenas, y una luz espectacular que entra desde la superficie. Ideal para fotografía.",
                "https://images.unsplash.com/photo-1561144257-e32e8506dd4e?w=800",
                36.7167, -2.1833, daysAgo(15));

        // Pedro – Canarias
        Publication p5 = pub(pedro,
                "Lanzarote: Jameos del Agua bajo el mar",
                "Exploración del tubo volcánico que se adentra en el mar. Buceo de caverna en las galerías " +
                "exteriores. Vimos cangrejos ciegos endémicos y formaciones de lava alucinantes. 18 m máx.",
                "https://images.unsplash.com/photo-1602699831543-e31e02bcbdfd?w=800",
                29.0167, -13.5833, daysAgo(60));

        Publication p6 = pub(pedro,
                "Tenerife: El Bajón de la Rajita",
                "Uno de los mejores puntos de buceo del sur de Tenerife. Bancos de bogas, peces loro y angel sharks " +
                "descansando en el fondo de arena. El volcán submarino crea una topografía increíble.",
                "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800",
                28.0833, -16.7333, daysAgo(50));

        Publication p7 = pub(pedro,
                "Fuerteventura: Bajo de Corredera",
                "Punto técnico con corriente. Mantas, tortugas y en temporada, tiburones ballena. El coral negro " +
                "a 40 metros es impresionante. Solo recomendado para buceadores con experiencia en corrientes.",
                "https://images.unsplash.com/photo-1508360228785-f8f649fdbdbe?w=800",
                28.3587, -14.0533, daysAgo(40));

        // María – Baleares
        Publication p8 = pub(maria,
                "Mallorca: Cueva de Sa Dona",
                "Cueva semisumergida en la costa este de Mallorca. Stalactitas bajo el agua que se formaron " +
                "hace miles de años cuando el nivel del mar era más bajo. Experiencia mística. Máx. 12 m.",
                "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800",
                39.3333, 3.1833, daysAgo(25));

        Publication p9 = pub(maria,
                "Menorca: Cala Pregonda",
                "Costa norte virgen de Menorca. Praderas de posidonia perfectamente conservadas, caballitos de mar " +
                "entre las algas y una colonia de estrellas frágiles a 15 metros. Agua como una piscina.",
                "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800",
                40.0500, 3.8500, daysAgo(10));

        Publication p10 = pub(maria,
                "Ibiza: Reserva Marina de Ses Salines",
                "El mar de Ibiza tiene una de las aguas más limpias del Mediterráneo gracias a la Posidonia oceánica. " +
                "Hippocampus guttulatus a 8 metros, pulpos gigantes y la visibilidad fue de 25 metros este día.",
                "https://images.unsplash.com/photo-1566241880756-31de96a1e5da?w=800",
                38.9100, 1.4300, daysAgo(5));

        // Javier – Valencia y Alicante
        Publication p11 = pub(javier,
                "Jávea: El Portitxol",
                "Pequeña cala protegida por el cabo de la Nao. Fondo rocoso con abanicos de Gorgonia polyps y " +
                "múltiples nudibraquios de colores. Una barracuda solitaria nos sorprendió en la bajada.",
                "https://images.unsplash.com/photo-1563999-6-9a6d4d87e8?w=800",
                38.8000, 0.1667, daysAgo(35));

        Publication p12 = pub(javier,
                "Denia: La Tramuntana",
                "Pared vertical que cae de 5 a 40 metros con gorgonias, esponjas rojas y numerosos lábridos. " +
                "Encontramos un cañón de la guerra civil español en el fondo. Historia e historia natural juntas.",
                "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800",
                38.8400, 0.1050, daysAgo(18));

        // Laura – Norte de España
        Publication p13 = pub(laura,
                "Asturias: Luarca y los pulpos gigantes",
                "El Cantábrico tiene una biodiversidad completamente diferente al Mediterráneo. Temperatura de " +
                "14 °C pero vale la pena. Pulpos de más de 2 metros, centollos y estrellas de mar gigantes.",
                "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800",
                43.5456, -6.5356, daysAgo(55));

        Publication p14 = pub(laura,
                "Cedeira, Galicia: Las Cíes del norte",
                "Ría de Cedeira, aguas frías pero extraordinariamente claras. Fondos de granito cubiertos de " +
                "algas pardas, espuertas de mar y erizos por doquier. Un rape perfectamente camuflado nos vigilaba.",
                "https://images.unsplash.com/photo-1625189659340-9255f30929e7?w=800",
                43.6667, -8.0500, daysAgo(70));

        Publication p15 = pub(laura,
                "Nerja: Cueva del Mar",
                "Buceo nocturno en la zona de Maro-Cerro Gordo, el Parque Natural más al este de Málaga. " +
                "Langostas saliendo a cazar, pulpos activos y bioluminiscencia al mover las manos. Mágico.",
                "https://images.unsplash.com/photo-1602462977716-f46b65ce4b4a?w=800",
                36.7333, -3.8667, daysAgo(8));

        List<Publication> pubs = publicationRepository.saveAll(
                List.of(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15));

        // ── Follows ──────────────────────────────────────────────────────────────
        List<UserFollow> follows = List.of(
                follow(carlos, ana),    follow(carlos, pedro),  follow(carlos, laura),
                follow(ana, carlos),    follow(ana, maria),     follow(ana, laura),
                follow(pedro, carlos),  follow(pedro, javier),  follow(pedro, laura),
                follow(maria, ana),     follow(maria, pedro),   follow(maria, laura),
                follow(javier, carlos), follow(javier, pedro),  follow(javier, maria),
                follow(laura, ana),     follow(laura, javier),  follow(laura, carlos)
        );
        followRepository.saveAll(follows);

        // ── Likes ─────────────────────────────────────────────────────────────────
        // p1 – Illes Medes
        likeRepository.saveAll(List.of(
                like(p1, ana), like(p1, pedro), like(p1, maria), like(p1, javier), like(p1, laura)));
        // p2 – Cap de Creus
        likeRepository.saveAll(List.of(
                like(p2, ana), like(p2, maria), like(p2, laura)));
        // p3 – Cabo de Palos
        likeRepository.saveAll(List.of(
                like(p3, carlos), like(p3, pedro), like(p3, javier), like(p3, laura)));
        // p4 – Cabo de Gata
        likeRepository.saveAll(List.of(
                like(p4, carlos), like(p4, maria), like(p4, javier)));
        // p5 – Lanzarote
        likeRepository.saveAll(List.of(
                like(p5, carlos), like(p5, ana), like(p5, maria), like(p5, laura)));
        // p6 – Tenerife
        likeRepository.saveAll(List.of(
                like(p6, ana), like(p6, javier), like(p6, laura)));
        // p7 – Fuerteventura
        likeRepository.saveAll(List.of(
                like(p7, carlos), like(p7, ana), like(p7, maria)));
        // p8 – Mallorca
        likeRepository.saveAll(List.of(
                like(p8, carlos), like(p8, pedro), like(p8, javier), like(p8, laura)));
        // p9 – Menorca
        likeRepository.saveAll(List.of(
                like(p9, carlos), like(p9, pedro), like(p9, ana)));
        // p10 – Ibiza
        likeRepository.saveAll(List.of(
                like(p10, carlos), like(p10, pedro), like(p10, javier), like(p10, laura)));
        // p11 – Jávea
        likeRepository.saveAll(List.of(
                like(p11, carlos), like(p11, ana), like(p11, maria)));
        // p12 – Denia
        likeRepository.saveAll(List.of(
                like(p12, pedro), like(p12, laura)));
        // p13 – Asturias
        likeRepository.saveAll(List.of(
                like(p13, carlos), like(p13, ana), like(p13, pedro), like(p13, javier)));
        // p14 – Cedeira
        likeRepository.saveAll(List.of(
                like(p14, carlos), like(p14, maria), like(p14, javier)));
        // p15 – Nerja
        likeRepository.saveAll(List.of(
                like(p15, carlos), like(p15, ana), like(p15, pedro), like(p15, maria), like(p15, javier)));

        // ── Comments ──────────────────────────────────────────────────────────────
        commentRepository.saveAll(List.of(
                comment(p1, ana,    "¡Sitio increíble! Las Medes son lo más del Mediterráneo, estuve el verano pasado y también flipé con los meros.", daysAgo(44)),
                comment(p1, pedro,  "¿Con qué escuela fuiste? Tengo ganas de ir desde hace tiempo.", daysAgo(43)),
                comment(p1, carlos, "Fui autónomo con un zodiac de alquiler. El acceso es libre desde Estartit.", daysAgo(43)),
                comment(p1, laura,  "La reserva es lo que hace que haya tantos peces grandes. Ojalá hubiera más así.", daysAgo(42)),

                comment(p2, maria,  "El volcánico del Cap de Creus es único, en ningún otro sitio del Mediterráneo se ve eso.", daysAgo(29)),
                comment(p2, javier, "¿Cuánta corriente había? Ese punto me da respeto.", daysAgo(29)),
                comment(p2, carlos, "Javier, ese día tuvimos suerte, estaba a 1-2 nudos. Hay días que es imposible entrar.", daysAgo(28)),

                comment(p3, carlos, "Ana, ¿a qué profundidad encontraste las gorgonias? El verano pasado estuve y no bajé de 25.", daysAgo(19)),
                comment(p3, ana,    "Carlos, a 35-38 metros. Hay que ir con nitrox o ser muy eficiente con el aire.", daysAgo(19)),
                comment(p3, laura,  "Las tortugas en Cabo de Palos son habituales, se ha notado mucho la mejora de la reserva.", daysAgo(18)),

                comment(p4, pedro,  "Cabo de Gata es tremendo para foto. ¿Qué cámara llevas?", daysAgo(14)),
                comment(p4, ana,    "Pedro, una Sony RX100 VII en carcasa. No necesitas más para ese fondo tan iluminado.", daysAgo(14)),

                comment(p5, carlos, "El tubo volcánico de Lanzarote es de otro mundo. ¿Hiciste la versión larga o la corta?", daysAgo(59)),
                comment(p5, pedro,  "Carlos, la larga con guía. La corta también vale pero la larga merece más la pena.", daysAgo(59)),
                comment(p5, ana,    "Los cangrejos ciegos son endémicos de las cuevas volcánicas, fascinante evolución.", daysAgo(58)),

                comment(p6, javier, "Las angel sharks de Tenerife son top. ¿Época del año? Tengo entendido que están más activas en invierno.", daysAgo(49)),
                comment(p6, pedro,  "Javier, exacto. Invierno y primavera son las mejores épocas. En verano se esconden más.", daysAgo(49)),

                comment(p7, carlos, "Eso de las mantas en Fuerteventura no lo sabía. ¿En qué mes?", daysAgo(39)),
                comment(p7, pedro,  "Carlos, finales de otoño e invierno. Cuando hay plancton abundante.", daysAgo(39)),

                comment(p8, pedro,  "Las cuevas con estalagmitas sumergidas son de lo más especial. ¿La cueva tiene mucha profundidad?", daysAgo(24)),
                comment(p8, maria,  "Pedro, máximo 12 metros en el interior. Ideal incluso para buceadores con poca experiencia.", daysAgo(24)),
                comment(p8, javier, "Menuda foto, María. El efecto de la luz entrando en la cueva es espectacular.", daysAgo(23)),

                comment(p9, ana,    "La Posidonia de Menorca está en un estado de conservación excepcional. Qué suerte haberla visto.", daysAgo(9)),
                comment(p9, carlos, "Los caballitos de mar son muy difíciles de ver, enhorabuena. ¿Cuánto tiempo tardaste en encontrarlos?", daysAgo(9)),
                comment(p9, maria,  "Carlos, unos 20 minutos buscando entre las algas. Hay que tener paciencia.", daysAgo(9)),

                comment(p10, pedro, "Ibiza tiene fama de fiesta pero el fondo marino es una maravilla olvidada. Gran post.", daysAgo(4)),
                comment(p10, javier,"¿Cuántos metros de visibilidad? Lo has puesto en el texto pero no me creo 25 metros en agosto.", daysAgo(4)),
                comment(p10, maria, "Javier, fue en mayo, no en agosto. En verano baja bastante por el turismo. 😄", daysAgo(3)),

                comment(p11, ana,   "El Portitxol es de los mejores puntos del norte de Alicante. ¿Entraste desde tierra o en barco?", daysAgo(34)),
                comment(p11, javier,"Ana, desde tierra, hay un pequeño embarcadero de piedra. En calma absoluta se puede entrar muy bien.", daysAgo(34)),

                comment(p12, maria, "¿El cañón está a cuántos metros de profundidad? Me gustaría investigar más sobre él.", daysAgo(17)),
                comment(p12, javier,"María, está a unos 35 metros. Hay registros históricos en la web de patrimonio subacuático de la Comunitat Valenciana.", daysAgo(17)),

                comment(p13, carlos,"El Cantábrico me tiene pendiente. ¿Cuántos grados tenía el agua?", daysAgo(54)),
                comment(p13, laura, "Carlos, 14 grados ese día. Traje seco o mínimo 7mm. Pero merece la pena.", daysAgo(54)),
                comment(p13, ana,   "Los pulpos del Cantábrico son enormes comparado con los del Mediterráneo. Flora y fauna muy distintas.", daysAgo(53)),

                comment(p14, pedro, "Galicia es otra dimensión para el buceo. Las aguas frías conservan mucho mejor el fondo.", daysAgo(69)),
                comment(p14, javier,"Un rape camuflado debe dar un susto de muerte si te lo encuentras de repente. 😂", daysAgo(69)),
                comment(p14, laura, "Javier, literalmente di un salto hacia atrás cuando lo vi moverse. Alucinante camuflaje.", daysAgo(68)),

                comment(p15, carlos,"El buceo nocturno en Nerja es una experiencia que todo buceador debería hacer al menos una vez.", daysAgo(7)),
                comment(p15, ana,   "La bioluminiscencia es magia pura. ¿Tuviste linterna con filtro rojo para no asustar a los animales?", daysAgo(7)),
                comment(p15, laura, "Ana, exacto, linterna roja. Los invertebrados nocturnos no reaccionan igual que con luz blanca.", daysAgo(6)),
                comment(p15, pedro, "Nerja es Plan A para mi próxima escapada al sur. ¿Con qué centro de buceo?", daysAgo(6)),
                comment(p15, laura, "Pedro, con Dive Nerja, muy profesionales y conocen todos los puntos nocturnos de la zona.", daysAgo(5))
        ));

        // ── Saves ─────────────────────────────────────────────────────────────────
        saveRepository.saveAll(List.of(
                save(p1,  pedro),  save(p1,  javier),
                save(p3,  carlos), save(p3,  pedro),
                save(p5,  ana),    save(p5,  maria),  save(p5,  javier),
                save(p7,  laura),
                save(p8,  carlos), save(p8,  ana),
                save(p10, pedro),  save(p10, javier),
                save(p13, carlos), save(p13, ana),    save(p13, javier),
                save(p14, maria),  save(p14, pedro),
                save(p15, carlos), save(p15, javier)
        ));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private User user(String googleId, String email, String name, String pictureUrl,
                      String customName, String customPictureUrl) {
        return User.builder()
                .googleId(googleId)
                .email(email)
                .name(name)
                .pictureUrl(pictureUrl)
                .customName(customName)
                .customPictureUrl(customPictureUrl)
                .build();
    }

    private Publication pub(User author, String title, String description,
                            String imageUrl, double lat, double lng, Instant createdAt) {
        Publication p = Publication.builder()
                .user(author)
                .title(title)
                .description(description)
                .imageUrl(imageUrl)
                .latitude(lat)
                .longitude(lng)
                .createdAt(createdAt)
                .build();
        return p;
    }

    private UserFollow follow(User follower, User followed) {
        return UserFollow.builder()
                .follower(follower)
                .followed(followed)
                .createdAt(Instant.now())
                .build();
    }

    private PublicationLike like(Publication pub, User user) {
        return PublicationLike.builder()
                .publication(pub)
                .user(user)
                .createdAt(Instant.now())
                .build();
    }

    private Comment comment(Publication pub, User author, String text, Instant createdAt) {
        Comment c = Comment.builder()
                .publication(pub)
                .user(author)
                .text(text)
                .createdAt(createdAt)
                .build();
        return c;
    }

    private PublicationSave save(Publication pub, User user) {
        return PublicationSave.builder()
                .publication(pub)
                .user(user)
                .createdAt(Instant.now())
                .build();
    }

    private static Instant daysAgo(long days) {
        return Instant.now().minus(days, ChronoUnit.DAYS);
    }
}

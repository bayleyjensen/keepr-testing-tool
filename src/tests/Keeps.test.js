import { Test } from "@bcwdev/vue-api-tester";
import { UtilitySuite } from "./UtilitySuite";
import { SetAuth } from "./AuthUtility";
import { getInstance } from "@bcwdev/auth0-vue";

const PATH = "https://localhost:5001/api/keeps";

let keepObj = {
  name: "TEST__KEEP",
  description: "KEEP__DESCRIPTION",
  img: "//placehold.it/200x200",
  isPrivate: false,
  shares: 0,
  views: 0,
  keeps: 0
};

export class KeepsSuite extends UtilitySuite {
  constructor() {
    super("Keeps Testing", PATH);
    SetAuth(this.request);
    this.addTests(
      new Test(
        {
          name: "Can Create a keep",
          path: PATH,
          description:
            "POST request. This should create a new keep in your database. UserId is attached on the server side",
          expected: "Keep",
          payload: "Keep object {name, description, img, isPrivate}"
        },
        async () => {
          let keep;
          try {
            let user = await this.CheckUserAsync();
            keep = await this.create({
              ...keepObj,
              userId: "dont trust the front end"
            });
            this.verifyIsSame(keepObj, keep);
            if (
              keep.userId == "dont trust the front end" ||
              keep.userId != user.sub
            ) {
              return this.fail(
                "The keep.userId differs from the logged in users id. Users can create a keep with any user id."
              );
            }
            return this.pass("Successfully created a keep!", keep);
          } catch (e) {
            return this.unexpected(keepObj, this.handleError(e));
          } finally {
            if (keep) {
              await this.delete(keep.id);
            }
          }
        }
      ),
      new Test(
        {
          name: "Can Get Public Keeps",
          path: PATH,
          description: "GET request. This should get a list of public keeps.",
          expected: "Keep[]"
        },
        async () => {
          let keeps;
          try {
            let user = await this.CheckUserAsync();
            //FIXME this wont work anymore
            // let keep = await this.create(keepObj);
            // this.switchUserAsync();
            keeps = await this.get();
            if (keeps.length == 0) {
              return this.fail(
                "Please add at least one keep to test this route."
              );
            } else if (!keeps.every(k => !k.isPrivate || k.userId == user.id)) {
              return this.fail(
                "Able to retrieve private keeps that do not belong to the user."
              );
            } else if (!this.verifyIsSame(keepObj, keeps[0])) {
              return this.fail(
                "Array does not contain objects that match the given Keep model"
              );
            }
            return this.pass("Able to get keeps", keeps.splice(0, 3));
          } catch (e) {
            return this.unexpected([keepObj], this.handleError(e));
          }
        }
      ),
      new Test(
        {
          name: "Can Get keep by Id",
          path: PATH + "/:id",
          description: "GET request. This should get one keep by its id.",
          expected: "Keep"
        },
        async () => {
          let keeps;
          let keep;
          try {
            keeps = await this.get();
            if (keeps.length == 0) {
              return this.fail(
                "Please add at least one keep to test this route."
              );
            }
            keep = await this.getById(keeps[0].id);
            if (keeps[0].id != keep.id) {
              return this.fail("Could not retrieve the keep by its Id.");
            }
            return this.pass("Retrieved Keep by Id", keep);
          } catch (e) {
            return this.unexpected(keepObj, this.handleError(e));
          }
        }
      ),
      new Test(
        {
          name: "Can Edit keep by Id",
          path: PATH + "/:id",
          description: "PUT request. This should update one keep by its id.",
          expected: "Keep",
          payload: "Keep"
        },
        async () => {
          let keep;
          let updatedKeep;
          try {
            let newKeep = { ...keepObj };
            await this.CheckUserAsync();
            keep = await this.create(newKeep);
            let editedKeep = { ...keep };
            editedKeep.name = "edited keep";
            await this.update(editedKeep);
            updatedKeep = await this.getById(editedKeep.id);
            if (updatedKeep.name != editedKeep.name) {
              return this.fail("Could not edit the keep.");
            }
            return this.pass("Successfully edited the keep!", updatedKeep);
          } catch (e) {
            return this.unexpected(keepObj, this.handleError(e));
          } finally {
            if (keep) {
              await this.delete(keep.id);
            }
          }
        }
      ),
      new Test(
        {
          name: "Can delete keep by Id",
          path: PATH + "/:id",
          description: "DELETE request. This should delete one keep by its id.",
          expected: "Keep"
        },
        async () => {
          let keep;
          try {
            keep = await this.create({
              name: "TEST__KEEP__DELETABLE",
              description: "KEEP__DESCRIPTION_SHOULD_GET_DELETED",
              img: "//placehold.it/200x200",
              isPrivate: false
            });
          } catch (e) {
            return this.unexpected(keep, e.response.data);
          }

          try {
            await this.delete(keep.id);
          } catch (e) {
            return this.fail(e.message);
          }

          try {
            await this.getById(keep.id);
            return this.fail("Unable to delete keep by its Id");
          } catch (e) {
            return this.pass("Sucessfully removed keep by it's Id", keep);
          }
        }
      ),
      new Test(
        {
          name: "Can create Private keeps",
          path: PATH,
          description: "Create private keeps",
          expected: "Keep"
        },
        async () => {
          let keep;
          try {
            keep = await this.create({
              name: "TEST__KEEP__PRIVATE",
              description: "KEEP__SHOULD_BE_PRIVATE",
              img: "//placehold.it/200x200",
              isPrivate: true
            });
            if (!keep.isPrivate) {
              return this.fail("Could not make a private keep");
            }
            return this.pass("Able to create private keeps", keep);
          } catch (e) {
            return this.unexpected(keep, this.handleError(e));
          }
        }
      )
    );
  }
}
